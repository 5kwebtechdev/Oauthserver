package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.GoogleSignupHandoffService;
import com.pkce.authserver.service.SessionLoginHelper;
import com.pkce.authserver.service.UserRegistrationService;
import com.pkce.authserver.superme.dto.RegisterRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Verifies a Google ID token obtained client-side (Google Identity Services, rendered on
 * both the BE login page and the Angular app) and establishes this backend's own login
 * session for the matching SuperMeApp account. See SessionLoginHelper for how this resumes
 * the original /oauth2/authorize request.
 *
 * Existing users sign in with a verified Google ID token. New users can be created in the same
 * request when the FE also supplies the profile fields the shared SuperMe table requires.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class GoogleLoginController {

    private final GoogleLoginService googleLoginService;
    private final AppUserDetailsService appUserDetailsService;
    private final SessionLoginHelper sessionLoginHelper;
    private final UserRegistrationService userRegistrationService;
    private final GoogleSignupHandoffService googleSignupHandoffService;

    @PostMapping("/google-login")
    public ResponseEntity<Map<String, Object>> googleLogin(@Valid @RequestBody GoogleLoginRequest request,
                                                             HttpServletRequest httpRequest,
                                                             HttpServletResponse httpResponse) {
        GoogleLoginService.Result result;
        try {
            result = googleLoginService.verifyAndUpsert(request.idToken());
        } catch (GoogleLoginService.AccountNotRegisteredException e) {
            GoogleLoginService.GoogleIdentity identity = e.getIdentity();
            if (!hasRegistrationProfile(request)) {
                // Google does not disclose DOB, gender or family role. Ask the FE to collect those
                // real values before creating a SuperMe account; never invent profile data.
                Map<String, Object> body = new HashMap<>();
                body.put("error", "registration_required");
                body.put("message", "Complete your profile to finish Google sign-in");
                body.put("registrationRequired", true);
                body.put("email", identity.email());
                body.put("name", firstNonBlank(request.name(), identity.name()));
                body.put("pictureUrl", identity.pictureUrl());
                body.put("requiredFields", new String[]{"gender", "dateOfBirth", "relationship"});
                body.put("handoffTicket", googleSignupHandoffService.issue(request.idToken(), identity));
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
            }

            try {
                UserRegistrationService.Result registration = userRegistrationService.register(
                        registrationRequest(request, identity));
                result = new GoogleLoginService.Result(registration.user(), registration.newlyCreated());
            } catch (UserRegistrationService.RegistrationException e1) {
                return ResponseEntity.badRequest().body(Map.of(
                        "error", "registration_failed", "message", e1.getMessage()));
            } catch (IllegalStateException e1) {
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                        "error", "registration_disabled", "message", e1.getMessage()));
            }
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "invalid_google_token", "message", e.getMessage()));
        }

        // The email (or phone) is the identifier logins resolve on, not User.username, which is
        // nullable over there and is a display handle rather than a credential - see
        // SupermeUserLookup. loadVerifiedUser rather than loadUserByUsername because a Google
        // account need not have a password row at all.
        UserDetails userDetails;
        try {
            userDetails = appUserDetailsService.loadVerifiedUser(result.user);
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "unusable_account", "message", e.getMessage()));
        }
        String redirectTo = sessionLoginHelper.establishSessionAndResolveRedirect(userDetails, httpRequest, httpResponse);

        // Not Map.of: it throws NPE on a null value, and 45 of the live accounts have no email.
        Map<String, Object> body = new HashMap<>();
        body.put("username", userDetails.getUsername());
        body.put("email", result.user.getEmail());
        body.put("newUser", result.newlyCreated);
        body.put("redirectTo", redirectTo);
        return ResponseEntity.ok(body);
    }

    @PostMapping("/google-signup-handoff")
    public ResponseEntity<Map<String, Object>> consumeGoogleSignupHandoff(
            @Valid @RequestBody GoogleSignupHandoffRequest request) {
        GoogleSignupHandoffService.SignupIdentity identity = googleSignupHandoffService.consume(request.ticket());
        return ResponseEntity.ok(Map.of(
                "provider", "google", "providerId", identity.providerId(), "email", identity.email(),
                "name", identity.name() == null ? "" : identity.name(),
                "avatarUrl", identity.avatarUrl() == null ? "" : identity.avatarUrl(), "idToken", identity.idToken()));
    }

    @ExceptionHandler(GoogleSignupHandoffService.HandoffNotFoundException.class)
    public ResponseEntity<Map<String, Object>> expiredGoogleSignupHandoff() {
        return ResponseEntity.status(HttpStatus.GONE).body(Map.of(
                "error", "google_signup_handoff_expired",
                "message", "This Google signup link has expired. Please try Google sign-in again."));
    }

    private boolean hasRegistrationProfile(GoogleLoginRequest request) {
        return hasText(firstNonBlank(request.name(), null))
                && hasText(request.gender()) && request.dateOfBirth() != null
                && hasText(request.relationship());
    }

    private RegisterRequest registrationRequest(GoogleLoginRequest request,
                                                GoogleLoginService.GoogleIdentity identity) {
        RegisterRequest registration = new RegisterRequest();
        registration.setName(firstNonBlank(request.name(), identity.name()));
        registration.setEmail(identity.email());
        registration.setGender(request.gender());
        registration.setDateOfBirth(request.dateOfBirth());
        registration.setRelationship(request.relationship());
        registration.setFamilyName(request.familyName());
        registration.setFamilyCode(request.familyCode());
        registration.setPetName(request.petName());
        registration.setUsername(request.username());
        registration.setAvatarImageName(request.avatarImageName());
        registration.setReferralCode(request.referralCode());
        registration.setAsChild(request.asChild());
        registration.setUnlockPotential(request.unlockPotential());
        registration.setGoogleIdToken(request.idToken());
        return registration;
    }

    private static String firstNonBlank(String value, String fallback) {
        return hasText(value) ? value.trim() : fallback;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
