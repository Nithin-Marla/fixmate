package com.fixmate.dto;

import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.PaymentMethod;
import com.fixmate.enums.PaymentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BookingResponseDto {
    private Long id;
    private String customerName;
    private Long customerId;
    private String partnerName;
    private Long partnerId;
    private String categoryName;
    private Long categoryId;
    private String addressDetails;
    private LocalDateTime scheduledDate;
    private BookingStatus status;
    private Double totalAmount;
    private boolean isEmergency;
    private String notes;
    private Double customerLatitude;
    private Double customerLongitude;
    private Double partnerLatitude;
    private Double partnerLongitude;
    private String cancellationReason;
    private LocalDateTime completedAt;
    private LocalDateTime createdAt;
    private LocalDateTime statusUpdatedAt;

    // Payment info
    private PaymentStatus paymentStatus;
    private PaymentMethod paymentMethod;
    private BigDecimal serviceAmount;
    private BigDecimal platformFee;
    private BigDecimal discountAmount;
    private String couponCode;
    private String invoiceNumber;
}
