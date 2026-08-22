package com.fixmate.controller;

import com.fixmate.dto.*;
import com.fixmate.entity.AuditLog;
import com.fixmate.entity.User;
import com.fixmate.enums.KycStatus;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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

    @PatchMapping("/kyc/{profileId}")
    public ResponseEntity<ApiResponse<PartnerProfileDto>> reviewKyc(
            @AuthenticationPrincipal User admin,
            @PathVariable Long profileId,
            @RequestParam KycStatus status
    ) {
        PartnerProfileDto profile = adminService.reviewKyc(admin, profileId, status);
        return ResponseEntity.ok(ApiResponse.success("KYC status updated to " + status, profile));
    }

    @GetMapping("/customers")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> listCustomers(
            @AuthenticationPrincipal User admin
    ) {
        List<AdminUserDto> customers = adminService.listCustomers();
        return ResponseEntity.ok(ApiResponse.success("Customers fetched successfully", customers));
    }

    @GetMapping("/partners")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> listPartners(
            @AuthenticationPrincipal User admin
    ) {
        List<AdminUserDto> partners = adminService.listPartners();
        return ResponseEntity.ok(ApiResponse.success("Partners fetched successfully", partners));
    }

    @GetMapping("/kyc/pending")
    public ResponseEntity<ApiResponse<List<AdminUserDto>>> listPendingKyc(
            @AuthenticationPrincipal User admin
    ) {
        List<AdminUserDto> pending = adminService.listPendingKyc();
        return ResponseEntity.ok(ApiResponse.success("Pending KYC submissions fetched", pending));
    }

    @GetMapping("/bookings")
    public ResponseEntity<ApiResponse<List<AdminBookingDto>>> listBookings(
            @AuthenticationPrincipal User admin
    ) {
        List<AdminBookingDto> bookings = adminService.listBookings();
        return ResponseEntity.ok(ApiResponse.success("Bookings fetched successfully", bookings));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs(
            @AuthenticationPrincipal User admin,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size
    ) {
        List<AuditLog> logs = adminService.getAuditLogs(page, size);
        return ResponseEntity.ok(ApiResponse.success("Audit logs fetched", logs));
    }
}
