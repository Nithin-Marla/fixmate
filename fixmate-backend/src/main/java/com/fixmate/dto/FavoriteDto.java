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
public class FavoriteDto {
    private Long id;
    private Long partnerId;
    private String partnerName;
    private String serviceCategory;
    private Double averageRating;
    private Integer totalBookings;
    private Double distanceKm;
    private boolean isOnline;
    private boolean isAvailable;
    private LocalDateTime createdAt;
}
