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
public class BookingRequestDto {
    private Long partnerId;
    private Long categoryId;
    private Long addressId;
    private LocalDateTime scheduledDate;
    private String notes;
    private Double customerLatitude;
    private Double customerLongitude;
}
