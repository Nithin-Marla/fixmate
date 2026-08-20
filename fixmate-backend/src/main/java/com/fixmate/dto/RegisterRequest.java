package com.fixmate.dto;

import com.fixmate.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RegisterRequest {

    @NotBlank(message = "First name is required.")
    private String firstName;

    @NotBlank(message = "Last name is required.")
    private String lastName;

    @NotBlank(message = "Email is required.")
    @Email(message = "Please enter a valid email address.")
    private String email;

    @NotBlank(message = "Password is required.")
    @Size(min = 8, message = "Password must be at least 8 characters.")
    @Pattern(
        regexp = ".*[A-Z].*",
        message = "Password must contain at least one uppercase letter."
    )
    private String password;

    @NotBlank(message = "Phone number is required.")
    @Pattern(
        regexp = "^\\+?[0-9]{7,15}$",
        message = "Please enter a valid phone number with country code."
    )
    private String phone;

    private Role role;
}
