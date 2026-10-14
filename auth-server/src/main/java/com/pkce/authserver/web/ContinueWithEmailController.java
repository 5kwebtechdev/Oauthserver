package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.ContinueWithEmailService;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.service.SessionLoginHelper;
import com.pkce.authserver.service.TurnstileVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth/continue-with-email")
@RequiredArgsConstructor
public class ContinueWithEmailController {

    private final ContinueWithEmailService continueWithEmailService;
    private final AppUserDetailsService appUserDetailsService;
    private final SessionLoginHelper sessionLoginHelper;
    private final TurnstileVerificationService turnstileVerificationService;
    private final SecurityEventService securityEventService;

    /**
     * Demo trade-off: tells the caller whether the account exists, so the FE can say up front that
     * an unknown email has to register in SuperMeApp first rather than making them enter a code
     * that cannot work. A production version would answer identically either way to avoid account
     * enumeration, at the cost of not being able to branch the UI like this.
     *
     * Captcha-gated here (before any OTP is issued/emailed) rather than on /verify -
     * stopping a bot before it ever triggers an email is the whole point, not after.
     */
    @PostMapping("/request")
    public ResponseEntity<Map<String, Object>> request(@Valid @RequestBody ContinueWithEmailRequest request,
                                                         HttpServletRequest httpRequest) {
        if (!turnstileVerificationService.verify(request.captchaToken(), httpRequest.getRemoteAddr())) {
            securityEventService.record(SecurityEventType.CAPTCHA_FAILED, request.email(), httpRequest.getRemoteAddr(),
                    "continue-with-email/request");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "captcha_failed", "message", "Captcha verification failed."));
        }

        boolean exists = continueWithEmailService.accountExists(request.email());
        if (exists) {
            continueWithEmailService.issueOtp(request.email());
        }
        return ResponseEntity.ok(Map.of(
                "exists", exists,
                "message", exists
                        ? "Welcome back. We've emailed you a code - enter it to sign in."
                        : "No SuperMeApp account uses this email. Register in the app first, then sign in here."
        ));
    }

    @PostMapping("/verify")
    public ResponseEntity<Map<String, Object>> verify(@Valid @RequestBody ContinueWithEmailVerifyRequest request,
                                                        HttpServletRequest httpRequest,
                                                        HttpServletResponse httpResponse) {
        ContinueWithEmailService.Result result;
        try {
            result = continueWithEmailService.verifyAndLogin(request.email(), request.otp());
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "invalid_otp", "message", e.getMessage()));
        }

        UserDetails userDetails = appUserDetailsService.loadVerifiedUser(result.user);
        String redirectTo = sessionLoginHelper.establishSessionAndResolveRedirect(userDetails, httpRequest, httpResponse);

        return ResponseEntity.ok(Map.of(
                "username", result.user.getEmail(),
                "newUser", result.newlyCreated,
                "redirectTo", redirectTo
        ));
    }
}
