package com.pkce.authserver.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Login only - the account has to exist already (see ContinueWithEmailService), so there are no
 * registration fields to carry.
 */
public record ContinueWithEmailVerifyRequest(
        @NotBlank @Email String email,
        @NotBlank String otp
) {
}
