package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PaymentResponseDto {
    private Long id;
    private Long bookingId;
    private String bookingCategory;
    private Double serviceAmount;
    private Double platformFee;
    private Double totalAmount;
    private Double discountAmount;
    private String couponCode;
    private String status;
    private String method;
    private String transactionRef;
    private String invoiceNumber;
    private java.time.LocalDateTime createdAt;
    private java.time.LocalDateTime paidAt;
}
