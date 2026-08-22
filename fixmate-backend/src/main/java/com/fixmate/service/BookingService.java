package com.fixmate.service;

import com.fixmate.dto.*;
import com.fixmate.entity.*;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.NotificationType;
import com.fixmate.enums.PaymentStatus;
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
    private final PaymentRepository paymentRepository;
    private final AuditLogService auditLogService;

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

        auditLogService.log("BOOKING_CREATED", "Booking", savedBooking.getId(),
                "Booking created by " + customer.getFirstName() + " with " + partner.getFirstName(), customer);

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

    /**
     * Enhanced status update with proper workflow validation.
     * Partners: ACCEPTED, ON_WAY, ARRIVED, IN_PROGRESS, COMPLETED
     * Customers: CANCELLED only (with reason)
     */
    public BookingResponseDto updateBookingStatus(Long bookingId, User user, BookingStatus newStatus) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isPartner = booking.getPartner().getId().equals(user.getId());

        if (!isCustomer && !isPartner) {
            throw new RuntimeException("You are not authorized to update this booking.");
        }

        validateStatusTransition(booking.getStatus(), newStatus, isCustomer);

        booking.setStatus(newStatus);
        Booking savedBooking = bookingRepository.save(booking);

        User userToNotify = isCustomer ? booking.getPartner() : booking.getCustomer();
        String updaterName = isCustomer
                ? booking.getCustomer().getFirstName()
                : booking.getPartner().getFirstName();

        NotificationType type = switch (newStatus) {
            case ACCEPTED -> NotificationType.BOOKING_ACCEPTED;
            case CANCELLED -> NotificationType.BOOKING_CANCELLED;
            default -> NotificationType.BOOKING_REMINDER;
        };
        String title = switch (newStatus) {
            case ACCEPTED -> "Booking Accepted";
            case ON_WAY -> "Professional On The Way";
            case ARRIVED -> "Professional Has Arrived";
            case IN_PROGRESS -> "Service Started";
            case COMPLETED -> "Service Completed";
            case CANCELLED -> "Booking Cancelled";
            default -> "Booking Status Updated";
        };

        notificationService.sendNotification(
                userToNotify,
                type,
                title,
                updaterName + " updated booking #" + booking.getId()
                        + " (" + booking.getCategory().getName() + ") to " + newStatus.name(),
                booking.getId());

        auditLogService.log("BOOKING_STATUS_CHANGED", "Booking", booking.getId(),
                "Status changed to " + newStatus.name() + " by " + updaterName, user);

        return mapToDto(savedBooking);
    }

    /**
     * Cancel a booking with a reason. Both customer and partner can cancel.
     */
    public BookingResponseDto cancelBooking(Long bookingId, User user, CancelBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isPartner = booking.getPartner().getId().equals(user.getId());

        if (!isCustomer && !isPartner) {
            throw new RuntimeException("You are not authorized to cancel this booking.");
        }

        if (booking.getStatus() == BookingStatus.COMPLETED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new RuntimeException("Cannot cancel a " + booking.getStatus().name() + " booking.");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        booking.setCancellationReason(request != null ? request.getReason() : null);
        Booking savedBooking = bookingRepository.save(booking);

        User userToNotify = isCustomer ? booking.getPartner() : booking.getCustomer();
        String canceller = isCustomer
                ? booking.getCustomer().getFirstName()
                : booking.getPartner().getFirstName();

        String reasonText = (request != null && request.getReason() != null && !request.getReason().isBlank())
                ? "\nReason: " + request.getReason() : "";

        notificationService.sendNotification(
                userToNotify,
                NotificationType.BOOKING_CANCELLED,
                "Booking Cancelled",
                canceller + " cancelled booking #" + booking.getId()
                        + " (" + booking.getCategory().getName() + ")" + reasonText,
                booking.getId());

        auditLogService.log("BOOKING_CANCELLED", "Booking", booking.getId(),
                "Cancelled by " + canceller + (reasonText.isEmpty() ? "" : ". Reason: " + request.getReason()), user);

        return mapToDto(savedBooking);
    }

    /**
     * Reschedule a booking to a new date/time.
     */
    public BookingResponseDto rescheduleBooking(Long bookingId, User user, RescheduleBookingRequest request) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isPartner = booking.getPartner().getId().equals(user.getId());

        if (!isCustomer && !isPartner) {
            throw new RuntimeException("You are not authorized to reschedule this booking.");
        }

        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.ACCEPTED) {
            throw new RuntimeException("Can only reschedule PENDING or ACCEPTED bookings.");
        }

        if (request.getNewScheduledDate() == null || request.getNewScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("New scheduled date must be in the future.");
        }

        booking.setScheduledDate(request.getNewScheduledDate());
        Booking savedBooking = bookingRepository.save(booking);

        User userToNotify = isCustomer ? booking.getPartner() : booking.getCustomer();
        String rescheduler = isCustomer
                ? booking.getCustomer().getFirstName()
                : booking.getPartner().getFirstName();

        String newDateStr = request.getNewScheduledDate().format(DateTimeFormatter.ofPattern("dd-MMM-yyyy hh:mm a"));
        notificationService.sendNotification(
                userToNotify,
                NotificationType.BOOKING_REMINDER,
                "Booking Rescheduled",
                rescheduler + " rescheduled booking #" + booking.getId()
                        + " to " + newDateStr,
                booking.getId());

        return mapToDto(savedBooking);
    }

    /**
     * Validate that the status transition is allowed.
     */
    private void validateStatusTransition(BookingStatus current, BookingStatus next, boolean isCustomer) {
        if (isCustomer) {
            if (next != BookingStatus.CANCELLED) {
                throw new RuntimeException("Customers can only CANCEL a booking.");
            }
            if (current == BookingStatus.COMPLETED || current == BookingStatus.CANCELLED) {
                throw new RuntimeException("Cannot cancel a " + current.name() + " booking.");
            }
            return;
        }

        // Partner transitions
        boolean valid = switch (current) {
            case PENDING -> next == BookingStatus.ACCEPTED || next == BookingStatus.CANCELLED;
            case ACCEPTED -> next == BookingStatus.ON_WAY || next == BookingStatus.ARRIVED
                    || next == BookingStatus.IN_PROGRESS || next == BookingStatus.CANCELLED;
            case ON_WAY -> next == BookingStatus.ARRIVED || next == BookingStatus.IN_PROGRESS
                    || next == BookingStatus.CANCELLED;
            case ARRIVED -> next == BookingStatus.IN_PROGRESS || next == BookingStatus.CANCELLED;
            case IN_PROGRESS -> next == BookingStatus.COMPLETED || next == BookingStatus.CANCELLED;
            case PAYMENT_PENDING -> false;
            default -> false;
        };

        if (!valid) {
            throw new RuntimeException(
                    "Cannot transition from " + current.name() + " to " + next.name());
        }
    }

    private double resolveCustomerCoordinate(Double liveCoordinate, Double addressCoordinate, String axis) {
        if (liveCoordinate != null) return liveCoordinate;
        if (addressCoordinate != null) return addressCoordinate;
        throw new RuntimeException("Customer location (" + axis + ") is required for booking.");
    }

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
        BookingResponseDto.BookingResponseDtoBuilder b = BookingResponseDto.builder()
                .id(booking.getId())
                .customerName(booking.getCustomer().getFirstName() + " " + booking.getCustomer().getLastName())
                .customerId(booking.getCustomer().getId())
                .partnerName(booking.getPartner().getFirstName() + " " + booking.getPartner().getLastName())
                .partnerId(booking.getPartner().getId())
                .categoryName(booking.getCategory().getName())
                .categoryId(booking.getCategory().getId())
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
                .cancellationReason(booking.getCancellationReason())
                .completedAt(booking.getCompletedAt())
                .createdAt(booking.getCreatedAt())
                .statusUpdatedAt(booking.getStatusUpdatedAt());

        // Attach payment info if available
        paymentRepository.findByBookingId(booking.getId()).ifPresent(payment -> {
            b.paymentStatus(payment.getStatus())
              .paymentMethod(payment.getMethod())
              .serviceAmount(payment.getServiceAmount())
              .platformFee(payment.getPlatformFee())
              .discountAmount(payment.getDiscountAmount())
              .couponCode(payment.getCouponCode())
              .invoiceNumber("FM-" + String.format("%05d", booking.getId()));
        });

        return b.build();
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

        double customerLat = resolveCustomerCoordinate(
                request.getCustomerLatitude(), address.getLatitude(), "latitude");
        double customerLon = resolveCustomerCoordinate(
                request.getCustomerLongitude(), address.getLongitude(), "longitude");

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
                .scheduledDate(LocalDateTime.now())
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

        auditLogService.log("EMERGENCY_BOOKING_CREATED", "Booking", savedBooking.getId(),
                "Emergency booking created by " + customer.getFirstName(), customer);

        return mapToDto(savedBooking);
    }
}
