package com.pkce.authserver.compat;

import com.pkce.authserver.compat.dto.OtpResponse;
import com.pkce.authserver.compat.dto.SendOtpRequest;
import com.pkce.authserver.compat.dto.VerifyOtpRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SuperMeBE's OtpController, at the paths the SuperMeApp frontend already calls:
 * POST /v1/api/auth/send-otp and POST /v1/api/auth/verify-otp.
 *
 * The /v1 prefix is declared on these compat controllers rather than set as a global
 * server.servlet.context-path, because a context path would also move /oauth2/*, /login and
 * /.well-known/* - which would change this server's issuer and break every PKCE client already
 * pointed at it.
 */
@RestController
@RequestMapping("/v1/api/auth")
@RequiredArgsConstructor
@Slf4j
public class SupermeOtpCompatController {

    private final SupermeOtpService otpService;

    @PostMapping("/send-otp")
    public ResponseEntity<OtpResponse> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        try {
            // The OTP itself must never leave the server in this response - it is only delivered by
            // the email sent inside sendOtp. Returning it would let anyone read it straight off the
            // API without ever owning the inbox.
            otpService.sendOtp(request.getEmail());
        } catch (SupermeOtpService.OtpException e) {
            return ResponseEntity.badRequest().body(OtpResponse.failure(e.getMessage()));
        }

        OtpResponse response = OtpResponse.success("OTP sent successfully");
        response.setEmail(request.getEmail());
        response.setIdentifierType("EMAIL");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<OtpResponse> verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        try {
            otpService.verifyOtp(request.getEmail(), request.getOtp());
            return ResponseEntity.ok(OtpResponse.success("OTP verified successfully", 4));
        } catch (SupermeOtpService.OtpException e) {
            return ResponseEntity.badRequest().body(OtpResponse.failure(e.getMessage()));
        }
    }
}
