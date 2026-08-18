package com.fixmate.controller;

import com.fixmate.dto.AdminDashboardDto;
import com.fixmate.dto.PartnerProfileDto;
import com.fixmate.entity.User;
import com.fixmate.enums.KycStatus;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<AdminDashboardDto>> getDashboardAnalytics(
            @AuthenticationPrincipal User admin
    ) {
        AdminDashboardDto analytics = adminService.getDashboardAnalytics(admin);
        return ResponseEntity.ok(ApiResponse.success("Admin Dashboard metrics fetched successfully", analytics));
    }

    /**
     * Approves or rejects a service partner's KYC submission.
     * Production path — in demo mode KYC auto-approves on submission.
     */
    @PatchMapping("/kyc/{profileId}")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> reviewKyc(
            @AuthenticationPrincipal User admin,
            @PathVariable Long profileId,
            @RequestParam KycStatus status
    ) {
        PartnerProfileDto profile = adminService.reviewKyc(admin, profileId, status);
        return ResponseEntity.ok(ApiResponse.success("KYC status updated to " + status, profile));
    }
}
