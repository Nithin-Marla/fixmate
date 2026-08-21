package com.fixmate.service;

import com.fixmate.dto.AuthenticationRequest;
import com.fixmate.dto.AuthenticationResponse;
import com.fixmate.dto.DeleteAccountRequest;
import com.fixmate.dto.RegisterRequest;
import com.fixmate.entity.User;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    /**
     * Additional validation rules that go beyond what Jakarta annotations
     * can express in the DTO.  Thrown before persisting so the Global
     * ExceptionHandler can surface them as 400 responses.
     */
    public AuthenticationResponse register(RegisterRequest request) {
        // ── Business-level validation ────────────────────────────────────────
        List<String> errors = new ArrayList<>();

        // Gmail-only
        if (request.getEmail() == null || !request.getEmail().toLowerCase().endsWith("@gmail.com")) {
            errors.add("Please enter a valid Gmail address (example@gmail.com).");
        }

        // Password: at least one special character (annotation already
        // enforces uppercase + min-length 8, but special char needs regex)
        if (request.getPassword() != null && !request.getPassword().matches(".*[^A-Za-z0-9].*")) {
            errors.add("Password must contain at least one special character.");
        }

        if (!errors.isEmpty()) {
            throw new RuntimeException(String.join(" ", errors));
        }

        // ── Duplicate check ──────────────────────────────────────────────────
        if (repository.findByEmail(request.getEmail()).isPresent()) {
            throw new RuntimeException("An account with this email already exists.");
        }

        var user = User.builder()
                .firstName(request.getFirstName().trim())
                .lastName(request.getLastName().trim())
                .email(request.getEmail().trim())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .build();
        repository.save(user);
        return buildResponse(user);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        String identifier = request.getIdentifier();
        String rawPassword = request.getPassword();

        if (identifier == null || identifier.isBlank() || rawPassword == null || rawPassword.isBlank()) {
            throw new BadCredentialsException("Invalid email or password");
        }

        // ── Resolve user: try email first, then phone ──────────────────────
        Optional<User> userOpt = repository.findByEmail(identifier.trim());
        if (userOpt.isEmpty()) {
            userOpt = repository.findByPhone(identifier.trim());
        }

        User user = userOpt.orElseThrow(() ->
                new BadCredentialsException("Invalid email or password"));

        // ── Verify password (BCrypt) ───────────────────────────────────────
        if (!passwordEncoder.matches(rawPassword, user.getPassword())) {
            throw new BadCredentialsException("Invalid email or password");
        }

        return buildResponse(user);
    }

    // ── Profile ──────────────────────────────────────────────────────────────

    /** Return the currently-authenticated user's profile from the security context. */
    public AuthenticationResponse getProfile() {
        User user = getAuthenticatedUser();
        return buildResponse(user);
    }

    // ── Delete account ───────────────────────────────────────────────────────

    /**
     * Permanently delete the authenticated user's account after email + password confirmation.
     * All dependent records (addresses, partner profile, notifications, warranties, bookings,
     * reviews) are explicitly removed first so foreign-key constraints are satisfied.
     */
    @Transactional
    public void deleteAccount(DeleteAccountRequest request) {
        User user = getAuthenticatedUser();

        // 1. Validate inputs
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Please enter your email address.");
        }
        if (request.getPassword() == null || request.getPassword().isBlank()) {
            throw new RuntimeException("Please enter your password.");
        }

        // 2. Email must match authenticated user
        if (!request.getEmail().trim().equalsIgnoreCase(user.getEmail())) {
            throw new RuntimeException("Email does not match the logged-in account.");
        }

        // 3. Password must be correct
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Incorrect password.");
        }

        // 4. Delete dependent records (order matters for FK constraints)
        //    - Addresses cascade-deleted via User's @OneToMany orphanRemoval
        //    - Reviews referencing this user (as customer or partner)
        //    - Bookings referencing this user (as customer or partner)
        //    - Notifications for this user
        //    - Warranties for this user
        //    - Service partner profile for this user
        repository.deleteUserDependents(user.getId());

        // 5. Delete the user (cascade handles addresses)
        repository.delete(user);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /** Extract the authenticated User from the Spring Security context. */
    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new BadCredentialsException("Not authenticated");
        }
        Object principal = auth.getPrincipal();
        if (principal instanceof User user) {
            return user;
        }
        // Fallback: look up by the principal's username (which is the email)
        String email = auth.getName();
        return repository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("User not found"));
    }

    private AuthenticationResponse buildResponse(User user) {
        var jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .token(jwtToken)
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole())
                .build();
    }
}
