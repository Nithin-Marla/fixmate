package com.fixmate.controller;

import com.fixmate.dto.AdminDashboardDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AdminService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
