package com.fixmate.service;

import com.fixmate.dto.EmergencyBookingRequestDto;
import com.fixmate.dto.BookingRequestDto;
import com.fixmate.dto.BookingResponseDto;
import com.fixmate.entity.*;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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

    public BookingResponseDto createBooking(User customer, BookingRequestDto request) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can create bookings.");
        }

        User partner = userRepository.findById(request.getPartnerId())
                .orElseThrow(() -> new RuntimeException("Partner not found."));

        ServicePartnerProfile partnerProfile = partnerProfileRepository.findByUser(partner)
                .orElseThrow(() -> new RuntimeException("Partner profile not found."));

        if (!partnerProfile.isAvailable() || partnerProfile.getKycStatus() != KycStatus.APPROVED) {
            throw new RuntimeException("Partner is not available for booking at the moment.");
        }

        ServiceCategory category = categoryRepository.findById(request.getCategoryId())
                .orElseThrow(() -> new RuntimeException("Service category not found."));

        Address address = addressRepository.findById(request.getAddressId())
                .orElseThrow(() -> new RuntimeException("Address not found."));

        if (!address.getUser().getId().equals(customer.getId())) {
            throw new RuntimeException("Address does not belong to the customer.");
        }

        Booking booking = Booking.builder()
                .customer(customer)
                .partner(partner)
                .category(category)
                .address(address)
                .scheduledDate(request.getScheduledDate())
                .status(BookingStatus.PENDING)
                .notes(request.getNotes())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // Notify Partner
        notificationService.sendAlert(
                partner,
                "New Booking Request",
                "You have received a new booking request from " + customer.getFirstName() + " for " + category.getName() + "."
        );

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

        // Notify Customer if Partner updated it, or Partner if Customer cancelled
        User userToNotify = isCustomer ? booking.getPartner() : booking.getCustomer();
        String updaterName = isCustomer ? "Customer" : "Service Partner";

        notificationService.sendAlert(
                userToNotify,
                "Booking Status Updated",
                "Your booking for " + booking.getCategory().getName() + " has been marked as " + newStatus.name() + " by the " + updaterName + "."
        );

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

        // Find nearest partner via SearchService
        ServicePartnerProfile nearestPartner = searchService.findNearestAvailablePartner(category.getName(), address)
                .orElseThrow(() -> new RuntimeException("No available partners found nearby for this emergency. Please try again later."));

        Booking booking = Booking.builder()
                .customer(customer)
                .partner(nearestPartner.getUser())
                .category(category)
                .address(address)
                .scheduledDate(LocalDateTime.now()) // Emergency implies NOW
                .status(BookingStatus.PENDING)
                .isEmergency(true)
                .notes(request.getNotes())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        // Notify Partner
        notificationService.sendAlert(
                nearestPartner.getUser(),
                "EMERGENCY Booking Assigned!",
                "You have been assigned an EMERGENCY booking for " + category.getName() + ". Please attend immediately."
        );

        return mapToDto(savedBooking);
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
                .build();
    }
}
