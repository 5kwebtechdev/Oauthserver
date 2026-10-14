package com.pkce.authserver.compat;

import com.pkce.authserver.compat.dto.ForgotPasswordRequest;
import com.pkce.authserver.compat.dto.OtpResponse;
import com.pkce.authserver.compat.dto.ResetPasswordRequest;
import com.pkce.authserver.compat.dto.VerifyOtpRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SuperMeBE's ForgotPasswordController, at the paths their frontend already calls:
 * POST /v1/auth/forgot-password, /verify-otp and /reset-password. Same request bodies, same
 * response messages, same status codes - see SupermeForgotPasswordService for the flow.
 *
 * Separate from this project's own /api/auth/forgot-password, which stays as it is: that one is
 * stateless and anti-enumeration (identical response whether or not the account exists), while this
 * one answers 404 for an unknown address because that is what their frontend branches on.
 */
@RestController
@RequestMapping("/v1/auth/forgot-password")
@RequiredArgsConstructor
@Slf4j
public class SupermeForgotPasswordCompatController {

    private final SupermeForgotPasswordService forgotPasswordService;

    /**
     * POST /v1/auth/forgot-password
     * Validates the email exists, then sends a 4-digit OTP to the inbox.
     */
    @PostMapping
    public ResponseEntity<OtpResponse> sendOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        log.info("Forgot-password OTP request for: {}", request.getEmail());
        try {
            forgotPasswordService.sendOtp(request.getEmail());
            return ResponseEntity.ok(OtpResponse.success("OTP sent successfully to your registered email"));
        } catch (SupermeForgotPasswordService.AccountNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(OtpResponse.failure(e.getMessage()));
        }
    }

    /**
     * POST /v1/auth/forgot-password/verify-otp
     * Verifies the 4-digit OTP. On success opens a 5-minute password-reset window.
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<OtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        log.info("Forgot-password OTP verify for: {}", request.getEmail());
        try {
            forgotPasswordService.verifyOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(OtpResponse.success("OTP verified successfully. You may now reset your password."));
        } catch (SupermeForgotPasswordService.ResetException e) {
            return ResponseEntity.badRequest().body(OtpResponse.failure(e.getMessage()));
        }
    }

    /**
     * POST /v1/auth/forgot-password/reset-password
     * Resets the password. Requires prior OTP verification within the reset window.
     * Password is BCrypt-hashed before storage.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<OtpResponse> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        log.info("Password reset attempt for: {}", request.getEmail());
        try {
            forgotPasswordService.resetPassword(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(OtpResponse.success("Password reset successfully. Please login with your new password."));
        } catch (SupermeForgotPasswordService.ResetException
                 | SupermeForgotPasswordService.AccountNotFoundException e) {
            return ResponseEntity.badRequest().body(OtpResponse.failure(e.getMessage()));
        }
    }
}
