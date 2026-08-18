package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Payload for a service partner updating their live location and/or
 * online/availability status from the partner dashboard.
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PartnerLocationRequest {
    private Double latitude;
    private Double longitude;
    private Boolean isOnline;
    private Boolean isAvailable;
}
