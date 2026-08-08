package com.fixmate.controller;

import com.fixmate.dto.BookingResponseDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.MaintenanceHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/maintenance")
@RequiredArgsConstructor
public class MaintenanceHistoryController {

    private final MaintenanceHistoryService historyService;

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getMaintenanceHistory(
            @AuthenticationPrincipal User customer
    ) {
        List<BookingResponseDto> history = historyService.getCompletedMaintenanceHistory(customer);
        return ResponseEntity.ok(ApiResponse.success("Digital Maintenance History fetched successfully", history));
    }
}
