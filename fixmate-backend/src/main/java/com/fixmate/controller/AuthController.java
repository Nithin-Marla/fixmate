package com.fixmate.controller;

import com.fixmate.dto.AuthenticationRequest;
import com.fixmate.dto.AuthenticationResponse;
import com.fixmate.dto.DeleteAccountRequest;
import com.fixmate.dto.RegisterRequest;
import com.fixmate.dto.UpdateEmailRequest;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService service;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> register(
            @Valid @RequestBody RegisterRequest request
    ) {
        AuthenticationResponse response = service.register(request);
        return ResponseEntity.ok(ApiResponse.success("User registered successfully", response));
    }

    @PostMapping("/authenticate")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> authenticate(
            @RequestBody AuthenticationRequest request
    ) {
        AuthenticationResponse response = service.authenticate(request);
        return ResponseEntity.ok(ApiResponse.success("User authenticated successfully", response));
    }

    /** Get authenticated user's profile — works even though /auth/** is permitAll
     *  because the JWT filter still populates SecurityContext when a token is present. */
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> getProfile(
            @AuthenticationPrincipal User user
    ) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        AuthenticationResponse profile = service.getProfile();
        return ResponseEntity.ok(ApiResponse.success("Profile loaded", profile));
    }

    /** Update email — same auth caveat as getProfile above. */
    @PutMapping("/email")
    public ResponseEntity<ApiResponse<AuthenticationResponse>> updateEmail(
            @AuthenticationPrincipal User user,
            @RequestBody UpdateEmailRequest request
    ) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        AuthenticationResponse response = service.updateEmail(request);
        return ResponseEntity.ok(ApiResponse.success("Email updated successfully", response));
    }

    /** Delete account — same auth caveat. */
    @DeleteMapping("/account")
    public ResponseEntity<ApiResponse<Void>> deleteAccount(
            @AuthenticationPrincipal User user,
            @RequestBody DeleteAccountRequest request
    ) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        service.deleteAccount(request);
        return ResponseEntity.ok(ApiResponse.success("Account deleted successfully", null));
    }
}
