package com.pkce.authserver.web;

import com.pkce.authserver.service.ForgotPasswordService;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.service.TurnstileVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Password reset via a real, emailed one-time code (see OtpService/EmailService) - the
 * code actually has to reach the account's own inbox, which is what proves the caller
 * owns it. Always returns the same /request response regardless of whether the username
 * exists (or has an email on file), so this endpoint can't be used to enumerate accounts.
 */
@RestController
@RequestMapping("/api/auth/forgot-password")
@RequiredArgsConstructor
public class ForgotPasswordController {

    private final ForgotPasswordService forgotPasswordService;
    private final TurnstileVerificationService turnstileVerificationService;
    private final SecurityEventService securityEventService;

    /** Captcha-gated before any username lookup happens, so a failed check can never leak account existence either. */
    @PostMapping("/request")
    public ResponseEntity<Map<String, String>> requestReset(@Valid @RequestBody ForgotPasswordRequest request,
                                                              HttpServletRequest httpRequest) {
        if (!turnstileVerificationService.verify(request.captchaToken(), httpRequest.getRemoteAddr())) {
            securityEventService.record(SecurityEventType.CAPTCHA_FAILED, request.username(), httpRequest.getRemoteAddr(),
                    "forgot-password/request");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "captcha_failed", "message", "Captcha verification failed."));
        }

        forgotPasswordService.requestReset(request.username());
        return ResponseEntity.ok(Map.of(
                "message", "If that account exists and has an email on file, a reset code has been sent."
        ));
    }

    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            forgotPasswordService.resetPassword(request.username(), request.otp(), request.newPassword());
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "invalid_otp", "message", e.getMessage()));
        }
        return ResponseEntity.ok(Map.of("message", "Password updated. You can log in with your new password now."));
    }
}
