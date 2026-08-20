package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A service partner found through real-time nearby discovery.
 * Includes the straight-line distance from the customer's location.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class NearbyPartnerDto {
    private Long partnerProfileId;
    private Long userId;
    private String firstName;
    private String lastName;
    private Integer experienceYears;
    private Double hourlyRate;
    private List<String> skills;
    private Double smartServiceScore;
    private Double distanceKm;

    /** The category the customer searched for (e.g. "Mechanic"). */
    private String serviceCategory;

    /** True when the partner is currently marked available. */
    private boolean available;

    /** True when the partner is currently online/active. */
    private boolean active;

    /** The partner's KYC status (always APPROVED for eligible results). */
    private String kycStatus;
}
