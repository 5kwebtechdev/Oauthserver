package com.pkce.authserver.web;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank String username,
        @NotBlank String otp,
        @NotBlank @Size(min = 8, max = 100) String newPassword
) {
}
