package com.fixmate.service;

import com.fixmate.dto.EmergencyBookingRequestDto;
import com.fixmate.dto.BookingRequestDto;
import com.fixmate.dto.BookingResponseDto;
import com.fixmate.entity.*;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.NotificationType;
import com.fixmate.enums.Role;
import com.fixmate.repository.*;
import com.fixmate.util.LocationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final AddressRepository addressRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;
    private final SearchService searchService;
    private final NotificationService notificationService;

    @Value("${fixmate.nearby-search.emergency-max-radius-km:25}")
    private double emergencyMaxRadiusKm;

    public BookingResponseDto createBooking(User customer, BookingRequestDto request) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can create bookings.");
        }

        if (request.getScheduledDate() == null || request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Scheduled date must be in the future.");
        }

        User partner = userRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new RuntimeException("Partner not found."));

        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Service category not found."));

        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found."));

        if (!address.getUser().getId().equals(customer.getId())) {
            throw new RuntimeException("Address does not belong to the customer.");
        }

        // --- Eligibility gate: only currently eligible partners can be booked ---
        ServicePartnerProfile partnerProfile = verifyPartnerEligible(partner, category);

        double customerLat = resolveCustomerCoordinate(
                request.getCustomerLatitude(), address.getLatitude(), "latitude");
        double customerLon = resolveCustomerCoordinate(
                request.getCustomerLongitude(), address.getLongitude(), "longitude");

        Booking booking = Booking.builder()
                .customer(customer)
                .partner(partner)
                .category(category)
                .address(address)
                .scheduledDate(request.getScheduledDate())
                .status(BookingStatus.PENDING)
                .notes(request.getNotes())
                .customerLatitude(customerLat)
                .customerLongitude(customerLon)
                .partnerLatitude(partnerProfile.getCurrentLatitude())
                .partnerLongitude(partnerProfile.getCurrentLongitude())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // Notify the selected partner (only after the booking persisted).
        double distanceKm = Math.round(LocationUtils.calculateDistance(
                customerLat, customerLon,
                partnerProfile.getCurrentLatitude(), partnerProfile.getCurrentLongitude()) * 100.0) / 100.0;
        String bookingDate = savedBooking.getScheduledDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy"));
        String bookingTime = savedBooking.getScheduledDate().format(DateTimeFormatter.ofPattern("hh:mm a"));
        notificationService.sendNotification(
                partner,
                NotificationType.BOOKING_CREATED,
                "New Service Request",
                customer.getFirstName() + " has requested " + category.getName() + " service.\n"
                        + "Distance: " + distanceKm + " km\n"
                        + "Booking Type: Scheduled\n"
                        + "Date: " + bookingDate + "\n"
                        + "Time: " + bookingTime,
                savedBooking.getId());

        return mapToDto(savedBooking);
    }

    public List<BookingResponseDto> getCustomerBookings(User customer) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can access their booking history here.");
        }
        return bookingRepository.findByCustomer(customer).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public List<BookingResponseDto> getPartnerBookings(User partner) {
        if (partner.getRole() != Role.ROLE_SERVICE_PARTNER) {
            throw new RuntimeException("Only service partners can access their assigned bookings here.");
        }
        return bookingRepository.findByPartner(partner).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public BookingResponseDto updateBookingStatus(Long bookingId, User user, BookingStatus newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isPartner = booking.getPartner().getId().equals(user.getId());

        if (!isCustomer && !isPartner) {
            throw new RuntimeException("You are not authorized to update this booking.");
        }

        // Basic workflow validation
        if (isCustomer && newStatus != BookingStatus.CANCELLED) {
            throw new RuntimeException("Customers can only CANCEL a booking.");
        }
        if (isPartner && newStatus == BookingStatus.CANCELLED) {
            throw new RuntimeException("Partners cannot CANCEL directly via this endpoint. Contact support.");
        }

        booking.setStatus(newStatus);
        Booking savedBooking = bookingRepository.save(booking);

        // Notify the other party (Customer if Partner updated it, Partner if Customer cancelled).
        User userToNotify = isCustomer ? booking.getPartner() : booking.getCustomer();
        String updaterName = isCustomer ? "Customer" : "Service Partner";

        NotificationType type = switch (newStatus) {
            case ACCEPTED -> NotificationType.BOOKING_ACCEPTED;
            case CANCELLED -> NotificationType.BOOKING_CANCELLED;
            default -> NotificationType.BOOKING_REMINDER;
        };
        String title = switch (newStatus) {
            case ACCEPTED -> "Booking Accepted";
            case CANCELLED -> "Booking Cancelled";
            default -> "Booking Status Updated";
        };

        notificationService.sendNotification(
                userToNotify,
                type,
                title,
                "Your " + booking.getCategory().getName() + " booking (#" + booking.getId()
                        + ") has been marked as " + newStatus.name() + " by the " + updaterName + ".",
                booking.getId());

        return mapToDto(savedBooking);
    }

    public BookingResponseDto createEmergencyBooking(User customer, EmergencyBookingRequestDto request) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can create emergency bookings.");
        }

        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Service category not found."));

        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found."));

        if (!address.getUser().getId().equals(customer.getId())) {
            throw new RuntimeException("Address does not belong to the customer.");
        }

        // Customer's live location takes priority; fall back to their address coordinates.
        double customerLat = resolveCustomerCoordinate(
                request.getCustomerLatitude(), address.getLatitude(), "latitude");
        double customerLon = resolveCustomerCoordinate(
                request.getCustomerLongitude(), address.getLongitude(), "longitude");

        // Find nearest currently-active partner using their LIVE location.
        ServicePartnerProfile nearestPartner = searchService.findNearestActivePartner(
                        category.getName(), customerLat, customerLon, emergencyMaxRadiusKm)
                .orElseThrow(() -> new RuntimeException(
                        "No nearby service partners available for " + category.getName()
                                + " within " + Math.round(emergencyMaxRadiusKm) + " km. Please try again later."));

        Booking booking = Booking.builder()
                .customer(customer)
                .partner(nearestPartner.getUser())
                .category(category)
                .address(address)
                .scheduledDate(LocalDateTime.now()) // Emergency implies NOW
                .status(BookingStatus.PENDING)
                .isEmergency(true)
                .notes(request.getNotes())
                .customerLatitude(customerLat)
                .customerLongitude(customerLon)
                .partnerLatitude(nearestPartner.getCurrentLatitude())
                .partnerLongitude(nearestPartner.getCurrentLongitude())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        double distanceKm = Math.round(LocationUtils.calculateDistance(
                customerLat, customerLon,
                nearestPartner.getCurrentLatitude(), nearestPartner.getCurrentLongitude()) * 100.0) / 100.0;
        notificationService.sendNotification(
                nearestPartner.getUser(),
                NotificationType.EMERGENCY_REQUEST,
                "Emergency Service Request",
                customer.getFirstName() + " needs " + category.getName() + " immediately.\n"
                        + "Location: Nearby\n"
                        + "Distance: " + distanceKm + " km",
                savedBooking.getId());

        return mapToDto(savedBooking);
    }

    private double resolveCustomerCoordinate(Double liveCoordinate, Double addressCoordinate, String axis) {
        if (liveCoordinate != null) {
            return liveCoordinate;
        }
        if (addressCoordinate != null) {
            return addressCoordinate;
        }
        throw new RuntimeException("Customer location (" + axis + ") is required for booking.");
    }

    /**
     * Eligibility gate shared by both booking flows. A partner can only be booked
     * when they are ROLE_SERVICE_PARTNER, KYC-approved, online, available, offer
     * the requested category, and have a live location.
     */
    private ServicePartnerProfile verifyPartnerEligible(User partner, ServiceCategory category) {
        if (partner.getRole() != Role.ROLE_SERVICE_PARTNER) {
            throw new RuntimeException("Selected user is not a service partner.");
        }

        ServicePartnerProfile profile = partnerProfileRepository.findByUser(partner)
                .orElseThrow(() -> new RuntimeException("Partner profile not found."));

        if (profile.getKycStatus() != KycStatus.APPROVED) {
            throw new RuntimeException("Partner KYC is not approved.");
        }
        if (!profile.isOnline()) {
            throw new RuntimeException("Partner is currently offline and cannot accept bookings.");
        }
        if (!profile.isAvailable()) {
            throw new RuntimeException("Partner has marked themselves unavailable.");
        }
        if (profile.getCurrentLatitude() == null || profile.getCurrentLongitude() == null) {
            throw new RuntimeException("Partner location is unavailable.");
        }
        if (profile.getSkills() == null || !profile.getSkills().contains(category.getName())) {
            throw new RuntimeException("Partner does not provide the requested service category.");
        }

        return profile;
    }

    private BookingResponseDto mapToDto(Booking booking) {
        return BookingResponseDto.builder()
                .id(booking.getId())
                .customerName(booking.getCustomer().getFirstName() + " " + booking.getCustomer().getLastName())
                .partnerName(booking.getPartner().getFirstName() + " " + booking.getPartner().getLastName())
                .categoryName(booking.getCategory().getName())
                .addressDetails(booking.getAddress().getStreet() + ", " + booking.getAddress().getCity())
                .scheduledDate(booking.getScheduledDate())
                .status(booking.getStatus())
                .totalAmount(booking.getTotalAmount())
                .isEmergency(booking.isEmergency())
                .notes(booking.getNotes())
                .customerLatitude(booking.getCustomerLatitude())
                .customerLongitude(booking.getCustomerLongitude())
                .partnerLatitude(booking.getPartnerLatitude())
                .partnerLongitude(booking.getPartnerLongitude())
                .build();
    }
}
