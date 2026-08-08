package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PartnerProfileRequest {
    private Integer experienceYears;
    private Double hourlyRate;
    private List<String> skills;
    private boolean isAvailable;
}
