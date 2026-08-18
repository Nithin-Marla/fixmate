package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Public partner profile shown to a customer when they tap "View Profile"
 * on a nearby partner card. Contains only information customers are allowed
 * to see — no email, phone, documents, or internal security data. Ratings
 * and reviews come from the partner's actual review history in the database.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PartnerProfileDetailsDto {
    private Long partnerProfileId;
    private Long userId;
    private String firstName;
    private String lastName;
    private String name;
    private String serviceCategory;
    private List<String> skills;
    private Integer experienceYears;
    private Double hourlyRate;
    private Double averageRating;
    private Integer totalReviews;
    private String kycStatus;
    private boolean available;
    private boolean active;
    private Double distanceKm;
    private Double smartServiceScore;
    private List<ReviewResponseDto> reviews;
}
