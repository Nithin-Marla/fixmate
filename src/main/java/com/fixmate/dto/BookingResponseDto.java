package com.fixmate.dto;

import com.fixmate.enums.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BookingResponseDto {
    private Long id;
    private String customerName;
    private String partnerName;
    private String categoryName;
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
}
