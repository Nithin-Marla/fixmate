package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AdminDashboardDto {
    private long totalCustomers;
    private long totalServicePartners;
    private long pendingKycApprovals;
    
    private long totalBookings;
    private long completedBookings;
    private long emergencyBookings;
    
    private Double totalRevenue;
}
