package com.fixmate.controller;

import com.fixmate.dto.PartnerEarningsDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.PartnerEarningsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/partner")
@RequiredArgsConstructor
public class EarningsController {

    private final PartnerEarningsService earningsService;

    @GetMapping("/earnings")
    public ResponseEntity<ApiResponse<PartnerEarningsDto>> getEarnings(
            @AuthenticationPrincipal User partner
    ) {
        PartnerEarningsDto earnings = earningsService.getEarnings(partner);
        return ResponseEntity.ok(ApiResponse.success("Earnings fetched successfully", earnings));
    }
}
