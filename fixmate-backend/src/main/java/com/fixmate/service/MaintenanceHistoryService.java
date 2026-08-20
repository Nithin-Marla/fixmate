package com.fixmate.service;

import com.fixmate.dto.BookingResponseDto;
import com.fixmate.entity.Booking;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MaintenanceHistoryService {

    private final BookingRepository bookingRepository;

    public List<BookingResponseDto> getCompletedMaintenanceHistory(User customer) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can access maintenance history.");
        }

        return bookingRepository.findByCustomerAndStatusOrderByScheduledDateDesc(customer, BookingStatus.COMPLETED)
                .stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
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
