package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminBookingDto {
    private Long id;
    private String customerName;
    private Long customerId;
    private String partnerName;
    private Long partnerId;
    private String categoryName;
    private String status;
    private Double totalAmount;
    private boolean isEmergency;
    private LocalDateTime scheduledDate;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
}
