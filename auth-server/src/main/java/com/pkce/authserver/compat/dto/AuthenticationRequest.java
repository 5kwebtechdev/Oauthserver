package com.pkce.authserver.compat.dto;

import jakarta.validation.constraints.AssertTrue;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Copied verbatim from SuperMeBE (com.superme.dto.AuthenticationRequest). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthenticationRequest {
    private String email;
    private String phone;
    private String password;

    /**
     * Ensure at least one of email or phone is provided for login.
     */
    @AssertTrue(message = "Either email or phone must be provided.")
    public boolean isEmailOrPhoneProvided() {
        return (email != null && !email.isEmpty()) || (phone != null && !phone.isEmpty());
    }
}
