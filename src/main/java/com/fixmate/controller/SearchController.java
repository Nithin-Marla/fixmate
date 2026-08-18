package com.fixmate.controller;

import com.fixmate.dto.LiveNearbyStreamRequest;
import com.fixmate.dto.NearbyPartnerDto;
import com.fixmate.dto.PartnerSearchResultDto;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.LiveNearbyService;
import com.fixmate.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;
    private final LiveNearbyService liveNearbyService;

    @GetMapping("/partners")
    public ResponseEntity<ApiResponse<List<PartnerSearchResultDto>>> searchPartners(
            @RequestParam String skill
    ) {
        List<PartnerSearchResultDto> partners = searchService.searchAvailablePartners(skill);
        return ResponseEntity.ok(ApiResponse.success("Partners fetched successfully", partners));
    }

    /**
     * Real-time nearby partner discovery.
     * Returns only currently online, available, KYC-approved partners who offer
     * the requested category, sorted by distance from the customer's location.
     */
    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<NearbyPartnerDto>>> searchNearbyPartners(
            @RequestParam Long categoryId,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false) Double radiusKm
    ) {
        SearchService.NearbySearchResult result = searchService.findNearbyPartners(categoryId, latitude, longitude, radiusKm);
        String message = result.isEmpty()
                ? result.emptyMessage()
                : "Nearby partners fetched successfully";
        return ResponseEntity.ok(ApiResponse.success(message, result.partners()));
    }

    /**
     * Opens a live SSE stream for the customer's current search. Requires the
     * customer's JWT (Authorization header). Returns an unguessable ticket;
     * the browser then connects to GET /search/nearby/stream/{ticket}, which is
     * intentionally unauthenticated because EventSource cannot send headers.
     */
    @PostMapping("/nearby/stream")
    public ResponseEntity<ApiResponse<Map<String, String>>> openLiveStream(
            @RequestBody LiveNearbyStreamRequest request
    ) {
        if (request.getCategoryId() == null || request.getLatitude() == null || request.getLongitude() == null) {
            throw new RuntimeException("categoryId, latitude and longitude are required to open a live stream.");
        }
        String ticket = liveNearbyService.createStream(
                request.getCategoryId(), request.getLatitude(), request.getLongitude(), request.getRadiusKm());
        // URL is relative to the API base (the frontend prefixes its API_URL,
        // which already ends in /api/v1), so the EventSource connects to
        // http://localhost:8080/api/v1/search/nearby/stream/{ticket}.
        return ResponseEntity.ok(ApiResponse.success("Live stream opened", Map.of(
                "streamId", ticket,
                "url", "/search/nearby/stream/" + ticket
        )));
    }

    /**
     * SSE endpoint consumed by the browser's EventSource. Authenticated by the
     * unguessable ticket, which is only issued by the authenticated POST above.
     * Pushes an initial snapshot and then live updates on partner changes.
     */
    @GetMapping(value = "/nearby/stream/{streamId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamNearbyPartners(@PathVariable String streamId) {
        SseEmitter emitter = liveNearbyService.getEmitter(streamId);
        if (emitter == null) {
            throw new RuntimeException("Live stream not found or expired. Run a new nearby search.");
        }
        liveNearbyService.sendInitialSnapshot(streamId);
        return emitter;
    }
}
