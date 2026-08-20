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
public class PartnerSearchResultDto {
    private Long partnerProfileId;
    private Long userId;
    private String firstName;
    private String lastName;
    private Integer experienceYears;
    private Double hourlyRate;
    private List<String> skills;
}
