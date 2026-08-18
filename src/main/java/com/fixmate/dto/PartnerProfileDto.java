package com.fixmate.dto;

import com.fixmate.enums.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PartnerProfileDto {
    private Long id;
    private Integer experienceYears;
    private Double hourlyRate;
    private List<String> skills;
    private boolean isAvailable;
    private boolean isOnline;
    private Double currentLatitude;
    private Double currentLongitude;
    private LocalDateTime lastLocationUpdate;
    private KycStatus kycStatus;
    private String kycDocumentRef;
    private Double smartServiceScore;
    private Integer totalReviews;
}
