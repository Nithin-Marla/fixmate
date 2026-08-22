package com.fixmate.dto;

import com.fixmate.enums.PaymentMethod;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ProcessPaymentRequest {
    private Long bookingId;
    private PaymentMethod method;
    private String couponCode;
}
