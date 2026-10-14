package com.pkce.authserver.compat.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

/** Copied verbatim from SuperMeBE (com.superme.dto.VerifyOtpRequest) - their codes are 4 digits. */
@Data
public class VerifyOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "OTP is required")
    @Pattern(regexp = "\\d{4}", message = "OTP must be exactly 4 digits")
    private String otp;
}
