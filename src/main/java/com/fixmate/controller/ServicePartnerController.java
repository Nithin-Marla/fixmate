package com.fixmate.controller;

import com.fixmate.dto.KycSubmissionRequest;
import com.fixmate.dto.PartnerProfileDto;
import com.fixmate.dto.PartnerProfileRequest;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.ServicePartnerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/partners")
@RequiredArgsConstructor
public class ServicePartnerController {

    private final ServicePartnerService partnerService;

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
}
