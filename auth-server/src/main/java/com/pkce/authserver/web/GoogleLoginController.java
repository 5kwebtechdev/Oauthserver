package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.SessionLoginHelper;
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
 * The account must already exist - see GoogleLoginService for why one cannot be created here - so
 * an unknown Google email comes back as 401 rather than signing anyone in.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class GoogleLoginController {

    private final GoogleLoginService googleLoginService;
    private final AppUserDetailsService appUserDetailsService;
    private final SessionLoginHelper sessionLoginHelper;

    @PostMapping("/google-login")
    public ResponseEntity<Map<String, Object>> googleLogin(@Valid @RequestBody GoogleLoginRequest request,
                                                             HttpServletRequest httpRequest,
                                                             HttpServletResponse httpResponse) {
        GoogleLoginService.Result result;
        try {
            result = googleLoginService.verifyAndUpsert(request.idToken());
        } catch (GoogleLoginService.AccountNotRegisteredException e) {
            // Not a failure so much as a fork in the road: the Google identity checks out, there is
            // just no SuperMeApp account behind it yet. Hand back what the token proved so the
            // caller can collect the rest (name, gender, date of birth, relationship) and post it
            // to /api/auth/register with this same token.
            GoogleLoginService.GoogleIdentity identity = e.getIdentity();
            Map<String, Object> body = new HashMap<>();
            body.put("error", "registration_required");
            body.put("message", e.getMessage());
            body.put("registrationRequired", true);
            body.put("email", identity.email());
            body.put("name", identity.name());
            body.put("pictureUrl", identity.pictureUrl());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body);
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
}
