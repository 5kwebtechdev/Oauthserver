package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.EmailService;
import com.pkce.authserver.service.GoogleIdentityVerifier;
import com.pkce.authserver.service.OtpService;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.service.SessionLoginHelper;
import com.pkce.authserver.service.TurnstileVerificationService;
import com.pkce.authserver.service.TokenIssuanceService;
import com.pkce.authserver.service.UserRegistrationService;
import com.pkce.authserver.superme.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Registers a new SuperMeApp account and answers with tokens, so a brand-new user is signed in by
 * the same call that created them rather than having to log in again afterwards. The body is
 * SuperMeBE's own RegisterRequest and the account it creates is theirs - see
 * UserRegistrationService.
 *
 * The caller must prove they own the identifier being registered, by one of:
 *   - "otp": the code emailed by /api/auth/register/request-otp, or
 *   - "googleIdToken": a Google ID token whose verified email matches the one being registered.
 *
 * SuperMeBE's own /register has no such check because its /register/verify-otp ran first inside the
 * same app and the browser was trusted to have done it. This endpoint is reachable on its own, so
 * without proof here anyone could create an account against someone else's email address.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class RegisterController {

    private static final String OTP_PURPOSE = "CONTINUE_WITH_EMAIL";

    private final UserRegistrationService registrationService;
    private final TokenIssuanceService tokenIssuanceService;
    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final OtpService otpService;
    private final AppUserDetailsService appUserDetailsService;
    private final SessionLoginHelper sessionLoginHelper;
    private final EmailService emailService;
    private final TurnstileVerificationService turnstileVerificationService;
    private final SecurityEventService securityEventService;

    /**
     * Emails a one-time code to an address that does not have an account yet - SuperMeBE's
     * /register/generate-otp. /continue-with-email/request deliberately won't do this: that one is
     * the login flow and only ever sends to an address that already has an account.
     *
     * Captcha-gated before anything is sent, same reasoning as continue-with-email: the point is to
     * stop a bot before it triggers mail, not after.
     */
    @PostMapping("/register/request-otp")
    public ResponseEntity<Map<String, Object>> requestRegistrationOtp(
            @Valid @RequestBody ContinueWithEmailRequest request,
            HttpServletRequest httpRequest) {

        if (!turnstileVerificationService.verify(request.captchaToken(), httpRequest.getRemoteAddr())) {
            securityEventService.record(SecurityEventType.CAPTCHA_FAILED, request.email(),
                    httpRequest.getRemoteAddr(), "register/request-otp");
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "captcha_failed", "message", "Captcha verification failed."));
        }

        boolean alreadyRegistered = registrationService.accountExists(request.email());
        if (!alreadyRegistered) {
            emailService.sendOtpEmail(request.email(), otpService.issue(OTP_PURPOSE, request.email()));
        }

        return ResponseEntity.ok(Map.of(
                "alreadyRegistered", alreadyRegistered,
                "message", alreadyRegistered
                        ? "This email already has an account - sign in instead."
                        : "We've emailed you a code to confirm this address."
        ));
    }

    // Not @Valid: SuperMeBE's RegisterRequest has a phone @Pattern that rejects the "+91..." form
    // their own frontend sends, and their controller never applies it. UserRegistrationService does
    // the validation that matters, ported from their method.
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest request,
                                                        HttpServletRequest httpRequest,
                                                        HttpServletResponse httpResponse) {
        if (registrationService.phoneIsTakenByAnotherAccount(
                request.getEmail(), request.getPhone(), request.getCountryCode())) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "phone_already_registered",
                    "message", "This phone number is already linked to another account."));
        }
        try {
            verifyIdentifierOwnership(request);
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "verification_failed", "message", e.getMessage()));
        }

        UserRegistrationService.Result result;
        try {
            result = registrationService.register(request);
        } catch (UserRegistrationService.RegistrationException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "registration_failed", "message", e.getMessage()));
        } catch (IllegalStateException e) {
            // Writes are switched off on this deployment.
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("error", "registration_disabled", "message", e.getMessage()));
        }

        Map<String, Object> body = new LinkedHashMap<>(tokenIssuanceService.issueTokens(result.user()));

        // Also establish the browser session and report where the original /oauth2/authorize
        // request wanted to go, so both kinds of caller are served by one response: a mobile or
        // server-side client just uses the tokens above, while a browser mid-PKCE-flow can follow
        // redirectTo and complete the authorization it started, arriving already signed in.
        UserDetails userDetails = appUserDetailsService.loadVerifiedUser(result.user());
        body.put("redirectTo", sessionLoginHelper.establishSessionAndResolveRedirect(
                userDetails, httpRequest, httpResponse));
        body.put("newUser", result.newlyCreated());

        return ResponseEntity.status(result.newlyCreated() ? HttpStatus.CREATED : HttpStatus.OK).body(body);
    }

    /**
     * A Google token proves the email it carries; an OTP proves the email it was sent to. Either
     * way the proven address has to be the one being registered, or the proof is for someone else's
     * account. Phone-only registrations therefore need the Google path or an email as well - there
     * is no SMS sender in this project to verify a number with.
     */
    private void verifyIdentifierOwnership(RegisterRequest request) {
        String email = StringUtils.hasText(request.getEmail()) ? request.getEmail().trim() : null;

        if (StringUtils.hasText(request.getGoogleIdToken())) {
            String verifiedEmail = googleIdentityVerifier.verifiedEmailOf(request.getGoogleIdToken());
            if (email == null || !verifiedEmail.equalsIgnoreCase(email)) {
                throw new BadCredentialsException(
                        "The Google account (" + verifiedEmail + ") does not match the email being registered");
            }
            return;
        }

        if (StringUtils.hasText(request.getOtp())) {
            if (email == null) {
                throw new BadCredentialsException("An email is required to verify the code");
            }
            if (!otpService.verify(OTP_PURPOSE, email, request.getOtp())) {
                throw new BadCredentialsException("Incorrect or expired code");
            }
            return;
        }

        throw new BadCredentialsException(
                "Registration needs proof of the email: send either 'otp' or 'googleIdToken'");
    }
}
