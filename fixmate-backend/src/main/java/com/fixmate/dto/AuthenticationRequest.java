package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationRequest {
    /** Accepts either an email address or a full phone number with country code (e.g. +919440274562). */
    private String identifier;
    private String password;
}
