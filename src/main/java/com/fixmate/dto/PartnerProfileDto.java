package com.fixmate.dto;

import com.fixmate.enums.KycStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private KycStatus kycStatus;
    private String kycDocumentRef;
    private Double smartServiceScore;
    private Integer totalReviews;
}
