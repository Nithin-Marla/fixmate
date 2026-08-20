package com.fixmate.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthenticationResponse {
    private Long id;
    private String firstName;
    private String lastName;
    private String token;
    private String email;
    private com.fixmate.enums.Role role;
}
