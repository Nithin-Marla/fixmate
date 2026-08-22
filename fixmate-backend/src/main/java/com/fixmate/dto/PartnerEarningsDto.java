package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PartnerEarningsDto {
    private Double totalEarnings;
    private Double platformFees;
    private Double netEarnings;
    private Long totalCompletedBookings;
    private Long totalCustomersServed;
    private Double averageRating;
    private java.util.List<DailyEarningDto> recentDailyEarnings;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DailyEarningDto {
        private String date;
        private Double earnings;
        private Long bookingCount;
    }
}
