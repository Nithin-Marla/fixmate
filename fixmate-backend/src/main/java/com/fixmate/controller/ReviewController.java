package com.fixmate.controller;

import com.fixmate.dto.ReviewRequestDto;
import com.fixmate.dto.ReviewResponseDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.ReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/reviews")
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/booking/{bookingId}")
    public ResponseEntity<ApiResponse<ReviewResponseDto>> createReview(
            @AuthenticationPrincipal User customer,
            @PathVariable Long bookingId,
            @RequestBody ReviewRequestDto request
    ) {
        ReviewResponseDto review = reviewService.createReview(customer, bookingId, request);
        return ResponseEntity.ok(ApiResponse.success("Review submitted successfully. Thank you!", review));
    }

    @GetMapping("/partner/{partnerId}")
    public ResponseEntity<ApiResponse<List<ReviewResponseDto>>> getPartnerReviews(
            @PathVariable Long partnerId
    ) {
        List<ReviewResponseDto> reviews = reviewService.getPartnerReviews(partnerId);
        return ResponseEntity.ok(ApiResponse.success("Reviews fetched successfully.", reviews));
    }
}
