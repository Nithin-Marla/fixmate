package com.fixmate.controller;

import com.fixmate.dto.BookingRequestDto;
import com.fixmate.dto.BookingResponseDto;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import com.fixmate.dto.EmergencyBookingRequestDto;

@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping("/emergency")
    public ResponseEntity<ApiResponse<BookingResponseDto>> createEmergencyBooking(
            @AuthenticationPrincipal User customer,
            @RequestBody EmergencyBookingRequestDto request
    ) {
        BookingResponseDto booking = bookingService.createEmergencyBooking(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Emergency Booking created successfully. Partner assigned.", booking));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponseDto>> createBooking(
            @AuthenticationPrincipal User customer,
            @RequestBody BookingRequestDto request
    ) {
        BookingResponseDto booking = bookingService.createBooking(customer, request);
        return ResponseEntity.ok(ApiResponse.success("Booking created successfully", booking));
    }

    @GetMapping("/customer")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getCustomerBookings(
            @AuthenticationPrincipal User customer
    ) {
        List<BookingResponseDto> bookings = bookingService.getCustomerBookings(customer);
        return ResponseEntity.ok(ApiResponse.success("Customer bookings fetched successfully", bookings));
    }

    @GetMapping("/partner")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getPartnerBookings(
            @AuthenticationPrincipal User partner
    ) {
        List<BookingResponseDto> bookings = bookingService.getPartnerBookings(partner);
        return ResponseEntity.ok(ApiResponse.success("Partner bookings fetched successfully", bookings));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<BookingResponseDto>> updateBookingStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal User user,
            @RequestParam BookingStatus status
    ) {
        BookingResponseDto updatedBooking = bookingService.updateBookingStatus(id, user, status);
        return ResponseEntity.ok(ApiResponse.success("Booking status updated successfully", updatedBooking));
    }
}
