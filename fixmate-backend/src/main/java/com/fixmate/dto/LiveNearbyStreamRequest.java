package com.fixmate.dto;

import lombok.Data;

/**
 * Body for POST /api/v1/search/nearby/stream — the customer's search context.
 * The server returns an unguessable stream ticket; the browser then connects
 * to GET /api/v1/search/nearby/stream/{ticket} via EventSource (which cannot
 * send Authorization headers, so the ticket acts as the bearer credential).
 */
@Data
public class LiveNearbyStreamRequest {
    private Long categoryId;
    private Double latitude;
    private Double longitude;
    private Double radiusKm;
}
