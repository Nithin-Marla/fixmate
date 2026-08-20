package com.fixmate.controller;

import com.fixmate.dto.UpdateProfileRequest;
import com.fixmate.dto.UserProfileDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> getProfile(
            @AuthenticationPrincipal User currentUser
    ) {
        UserProfileDto profile = userService.getUserProfile(currentUser);
        return ResponseEntity.ok(ApiResponse.success("User profile fetched successfully", profile));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfile(
            @AuthenticationPrincipal User currentUser,
            @RequestBody UpdateProfileRequest request
    ) {
        UserProfileDto updatedProfile = userService.updateUserProfile(currentUser, request);
        return ResponseEntity.ok(ApiResponse.success("User profile updated successfully", updatedProfile));
    }
}
