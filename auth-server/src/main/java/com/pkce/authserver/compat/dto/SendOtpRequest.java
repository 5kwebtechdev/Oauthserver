package com.pkce.authserver.compat.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Copied verbatim from SuperMeBE (com.superme.dto.SendOtpRequest). */
@Data
public class SendOtpRequest {

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;
}
