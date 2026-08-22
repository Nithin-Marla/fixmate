package com.fixmate.controller;

import com.fixmate.dto.FavoriteDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FavoriteDto>>> getFavorites(
            @AuthenticationPrincipal User customer
    ) {
        List<FavoriteDto> favorites = favoriteService.getFavorites(customer);
        return ResponseEntity.ok(ApiResponse.success("Favorites fetched successfully", favorites));
    }

    @PostMapping("/{partnerId}")
    public ResponseEntity<ApiResponse<FavoriteDto>> addFavorite(
            @AuthenticationPrincipal User customer,
            @PathVariable Long partnerId
    ) {
        FavoriteDto favorite = favoriteService.addFavorite(customer, partnerId);
        return ResponseEntity.ok(ApiResponse.success("Added to favorites", favorite));
    }

    @DeleteMapping("/{partnerId}")
    public ResponseEntity<ApiResponse<Void>> removeFavorite(
            @AuthenticationPrincipal User customer,
            @PathVariable Long partnerId
    ) {
        favoriteService.removeFavorite(customer, partnerId);
        return ResponseEntity.ok(ApiResponse.success("Removed from favorites", null));
    }

    @GetMapping("/check/{partnerId}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> checkFavorite(
            @AuthenticationPrincipal User customer,
            @PathVariable Long partnerId
    ) {
        boolean isFavorite = favoriteService.isFavorite(customer, partnerId);
        return ResponseEntity.ok(ApiResponse.success("Checked", Map.of("isFavorite", isFavorite)));
    }
}
