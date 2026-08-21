package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DeleteAccountRequest {
    /** Must match the email of the authenticated user. */
    private String email;
    /** The user's plaintext password, verified server-side with BCrypt. */
    private String password;
}
