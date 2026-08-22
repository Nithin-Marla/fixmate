package com.fixmate.service;

import com.fixmate.dto.PaymentResponseDto;
import com.fixmate.dto.ProcessPaymentRequest;
import com.fixmate.entity.Booking;
import com.fixmate.entity.Payment;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.PaymentMethod;
import com.fixmate.enums.PaymentStatus;
import com.fixmate.enums.Role;
import com.fixmate.entity.User;
import com.fixmate.repository.BookingRepository;
import com.fixmate.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final AuditLogService auditLogService;

    @Value("${fixmate.platform.fee-percent:10}")
    private double platformFeePercent;

    /**
     * Process payment for a completed booking.
     */
    public PaymentResponseDto processPayment(User user, ProcessPaymentRequest request) {
        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found."));

        boolean isCustomer = booking.getCustomer().getId().equals(user.getId());
        boolean isPartner = booking.getPartner().getId().equals(user.getId());

        if (!isCustomer && !isPartner && user.getRole() != Role.ROLE_ADMIN) {
            throw new RuntimeException("You are not authorized to process this payment.");
        }

        // Check if payment already exists
        Optional<Payment> existing = paymentRepository.findByBookingId(booking.getId());
        if (existing.isPresent()) {
            return mapToDto(existing.get());
        }

        if (booking.getStatus() != BookingStatus.COMPLETED && booking.getStatus() != BookingStatus.PENDING) {
            throw new RuntimeException("Payment can only be processed for COMPLETED or PENDING bookings.");
        }

        // Calculate amounts
        BigDecimal serviceAmount = BigDecimal.valueOf(booking.getTotalAmount() != null ? booking.getTotalAmount() : 299.0);
        BigDecimal platformFee = serviceAmount.multiply(BigDecimal.valueOf(platformFeePercent / 100))
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = serviceAmount.subtract(platformFee);

        // Apply coupon discount if any
        BigDecimal discount = BigDecimal.ZERO;
        // TODO: Validate coupon codes from a coupons table if needed

        Payment payment = Payment.builder()
                .booking(booking)
                .serviceAmount(serviceAmount)
                .platformFee(platformFee)
                .totalAmount(totalAmount)
                .discountAmount(discount)
                .couponCode(request.getCouponCode())
                .status(PaymentStatus.SUCCESS) // Simulated success
                .method(request.getMethod() != null ? request.getMethod() : PaymentMethod.CASH)
                .transactionRef("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .paidAt(LocalDateTime.now())
                .build();

        Payment saved = paymentRepository.save(payment);

        // Update booking amount
        booking.setTotalAmount(serviceAmount.doubleValue());
        bookingRepository.save(booking);

        auditLogService.log("PAYMENT_PROCESSED", "Payment", saved.getId(),
                "Payment of " + totalAmount + " processed for booking #" + booking.getId(),
                user);

        return mapToDto(saved);
    }

    /**
     * Get payment details for a booking.
     */
    public PaymentResponseDto getPaymentForBooking(Long bookingId) {
        Payment payment = paymentRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new RuntimeException("Payment not found for this booking."));
        return mapToDto(payment);
    }

    private PaymentResponseDto mapToDto(Payment payment) {
        return PaymentResponseDto.builder()
                .id(payment.getId())
                .bookingId(payment.getBooking().getId())
                .bookingCategory(payment.getBooking().getCategory() != null
                        ? payment.getBooking().getCategory().getName() : "")
                .serviceAmount(payment.getServiceAmount() != null ? payment.getServiceAmount().doubleValue() : null)
                .platformFee(payment.getPlatformFee() != null ? payment.getPlatformFee().doubleValue() : null)
                .totalAmount(payment.getTotalAmount() != null ? payment.getTotalAmount().doubleValue() : null)
                .discountAmount(payment.getDiscountAmount() != null ? payment.getDiscountAmount().doubleValue() : null)
                .couponCode(payment.getCouponCode())
                .status(payment.getStatus().name())
                .method(payment.getMethod().name())
                .transactionRef(payment.getTransactionRef())
                .invoiceNumber("FM-" + String.format("%05d", payment.getBooking().getId()))
                .createdAt(payment.getCreatedAt())
                .paidAt(payment.getPaidAt())
                .build();
    }
}
