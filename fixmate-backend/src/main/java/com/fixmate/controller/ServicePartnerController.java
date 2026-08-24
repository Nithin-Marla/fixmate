package com.fixmate.controller;

import com.fixmate.dto.KycSubmissionRequest;
import com.fixmate.dto.NearbyPartnerDto;
import com.fixmate.dto.PartnerLocationRequest;
import com.fixmate.dto.PartnerProfileDetailsDto;
import com.fixmate.dto.PartnerProfileDto;
import com.fixmate.dto.PartnerProfileRequest;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.ReviewService;
import com.fixmate.service.SearchService;
import com.fixmate.service.ServicePartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
public class ServicePartnerController {

    private final ServicePartnerService partnerService;
    private final SearchService searchService;
    private final ReviewService reviewService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> getProfile(
            @AuthenticationPrincipal User currentUser
    ) {
        PartnerProfileDto profile = partnerService.getProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.success("Partner profile fetched successfully", profile));
    }

    @PostMapping("/profile")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> createOrUpdateProfile(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PartnerProfileRequest request
    ) {
        PartnerProfileDto profile = partnerService.createOrUpdateProfile(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("Partner profile saved successfully", profile));
    }

    @PostMapping("/kyc")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> submitKyc(
            @AuthenticationPrincipal User currentUser,
            @RequestBody KycSubmissionRequest request
    ) {
        PartnerProfileDto profile = partnerService.submitKyc(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("KYC document submitted successfully", profile));
    }

    @PatchMapping("/availability")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> toggleAvailability(
            @AuthenticationPrincipal User currentUser,
            @RequestParam boolean isAvailable
    ) {
        PartnerProfileDto profile = partnerService.toggleAvailability(currentUser, isAvailable);
        return ResponseEntity.ok(ApiResponse.success("Availability updated successfully", profile));
    }

    /**
     * Updates the partner's live location (and optionally online/available state).
     * The partner dashboard calls this periodically while the partner is online.
     */
    @PostMapping("/location")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> updateLocation(
            @AuthenticationPrincipal User currentUser,
            @RequestBody PartnerLocationRequest request
    ) {
        PartnerProfileDto profile = partnerService.updateLocation(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("Location updated successfully", profile));
    }

    /**
     * Partner goes ONLINE/OFFLINE and marks themselves available/unavailable.
     */
    @PatchMapping("/status")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> setStatus(
            @AuthenticationPrincipal User currentUser,
            @RequestParam boolean isOnline,
            @RequestParam boolean isAvailable
    ) {
        PartnerProfileDto profile = partnerService.setAvailability(currentUser, isOnline, isAvailable);
        return ResponseEntity.ok(ApiResponse.success("Status updated successfully", profile));
    }

    @PatchMapping("/emergency")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> toggleEmergencyAvailability(
            @AuthenticationPrincipal User currentUser,
            @RequestParam boolean acceptsEmergency
    ) {
        PartnerProfileDto profile = partnerService.toggleEmergencyAvailability(currentUser, acceptsEmergency);
        return ResponseEntity.ok(ApiResponse.success("Emergency availability updated", profile));
    }

    /**
     * Public profile of a service partner (basic info + ratings + reviews from
     * the database), used by the customer's "View Profile" on a nearby partner
     * card. Identified by user id (unique), not name. Optionally computes the
     * straight-line distance when the customer's coordinates are supplied.
     */
    @GetMapping("/{userId}/profile")
    public ResponseEntity<ApiResponse<PartnerProfileDetailsDto>> getPublicProfile(
            @PathVariable Long userId,
            @RequestParam(required = false) String categoryName,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude
    ) {
        PartnerProfileDetailsDto profile = reviewService.getPartnerPublicProfile(
                userId, categoryName, latitude, longitude);
        return ResponseEntity.ok(ApiResponse.success("Partner profile fetched successfully", profile));
    }

    /**
     * Public nearby-discovery endpoint (alias of GET /search/nearby).
     * Returns only currently online, available, KYC-approved partners offering
     * the category, sorted by distance from the given location.
     */
    @GetMapping("/nearby")
    public ResponseEntity<ApiResponse<List<NearbyPartnerDto>>> nearbyPartners(
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
}
