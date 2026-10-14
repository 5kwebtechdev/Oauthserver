package com.pkce.authserver.web;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** captchaToken may be blank - TurnstileVerificationService treats that as a hard fail only once a real secret key is configured (see its Javadoc). */
public record ContinueWithEmailRequest(@NotBlank @Email String email, String captchaToken) {
}
