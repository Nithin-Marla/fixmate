package com.fixmate.service;

import com.fixmate.dto.AuthenticationRequest;
import com.fixmate.dto.AuthenticationResponse;
import com.fixmate.dto.RegisterRequest;
import com.fixmate.entity.User;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    /**
     * Additional validation rules that go beyond what Jakarta annotations
     * can express in the DTO.  Thrown before persisting so the Global
     *ExceptionHandler can surface them as 400 responses.
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
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .phone(request.getPhone())
                .role(request.getRole())
                .build();
        repository.save(user);
        return buildResponse(user);
    }

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        // The identifier can be an email or a phone number with country code.
        // UserDetailsService (ApplicationConfig) resolves both.
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getIdentifier(), request.getPassword()
                )
        );
        var user = repository.findByEmail(request.getIdentifier())
                .or(() -> repository.findByPhone(request.getIdentifier()))
                .orElseThrow();
        return buildResponse(user);
    }

    private AuthenticationResponse buildResponse(User user) {
        var jwtToken = jwtService.generateToken(user);
        return AuthenticationResponse.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .token(jwtToken)
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }
}
