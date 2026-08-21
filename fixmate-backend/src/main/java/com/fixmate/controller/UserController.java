package com.fixmate.controller;

import com.fixmate.dto.AuthenticationResponse;
import com.fixmate.dto.DeleteAccountRequest;
import com.fixmate.dto.UpdateEmailRequest;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/user")
@RequiredArgsConstructor
public class UserController {

    private final AuthService authService;

    /** Return the authenticated user's profile (from the JWT / security context). */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> getProfile() {
        AuthenticationResponse profile = authService.getProfile();
        return ResponseEntity.ok(ApiResponse.success("Profile loaded", profile));
    }

    /**
     * Update the authenticated user's email address.
     * Returns a new AuthenticationResponse with a fresh JWT.
     */
    @PutMapping("/email")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> updateEmail(
            @RequestBody UpdateEmailRequest request
    ) {
        AuthenticationResponse response = authService.updateEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Email updated successfully", response));
    }

    /**
     * Permanently delete the authenticated user's account.
     * Requires email + password confirmation in the request body.
     */
    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @RequestBody DeleteAccountRequest request
    ) {
        authService.deleteAccount(request);
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }
}
