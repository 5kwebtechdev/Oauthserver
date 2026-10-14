package com.pkce.authserver.compat;

import com.pkce.authserver.compat.dto.AuthenticationRequest;
import com.pkce.authserver.compat.dto.LoginResponse;
import com.pkce.authserver.compat.dto.UserResponseDto;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.service.LoginAttemptService;
import com.pkce.authserver.service.SupermeUserLookup;
import com.pkce.authserver.service.TokenIssuanceService;
import com.pkce.authserver.service.UserRegistrationService;
import com.pkce.authserver.superme.dto.RegisterRequest;
import com.pkce.authserver.superme.mapper.UserMapper;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * SuperMeBE's /auth endpoints, at the paths the SuperMeApp frontend already calls:
 * GET /v1/auth/check/alreadyRegistered, POST /v1/auth/register and POST /v1/auth/login.
 *
 * Request and response bodies match theirs field for field, so an existing client can be pointed
 * at this server without changing a line. What differs is underneath: the account is created by the
 * same ported registration this server's own endpoints use, and the token is this server's RS256
 * access token from the authorization server rather than their bespoke one - which is the whole
 * point of moving authentication here.
 *
 * Two deliberate differences from theirs, both invisible to a well-behaved client:
 *   - register requires that the email completed verify-otp recently (see SupermeOtpService).
 *     Theirs trusts the caller because nothing else could reach it; this server is reachable
 *     directly, so an unverified register would be an open account-creation endpoint.
 *   - the admin-table checks in checkAlreadyRegistered are not performed - those live in a second
 *     datasource (mindfullAdmin) this server has no business reading.
 */
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class SupermeAuthCompatController {

    private final UserRegistrationService registrationService;
    private final SupermeOtpService otpService;
    private final SupermeUserLookup userLookup;
    private final UserPasswordRepository userPasswordRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenIssuanceService tokenIssuanceService;
    private final LoginAttemptService loginAttemptService;
    private final com.pkce.authserver.service.AppUserDetailsService appUserDetailsService;
    private final com.pkce.authserver.service.SessionLoginHelper sessionLoginHelper;

    @GetMapping("/check/alreadyRegistered")
    public ResponseEntity<Map<String, Object>> checkAlreadyRegistered(
            @RequestParam("identifier") String identifier) {

        String message = registrationService.identifierIsTaken(identifier)
                ? "User already registered!"
                : "User not found!";

        Map<String, Object> response = new HashMap<>();
        response.put("identifier", identifier);
        response.put("message", message);
        response.put("status", message.equals("User already registered!"));
        return ResponseEntity.ok(response);
    }

    /**
     * Deliberately not @Valid, because theirs is not either. Their RegisterRequest carries
     * {@code @Pattern("^[0-9]{7,15}$")} on phone, which rejects the "+918078567854" form their own
     * frontend sends - the annotation is simply never applied over there, so the constraint is
     * dead and those phone numbers register fine. Applying it here would reject payloads the real
     * API accepts. The checks that actually matter (name, email-or-phone, date of birth,
     * relationship, gender) are enforced by UserRegistrationService, ported from their own method.
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (!StringUtils.hasText(request.getEmail()) || !otpService.consumeVerification(request.getEmail())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "message", "Verify this email with an OTP before registering.",
                    "error", "verification_required"));
        }

        UserRegistrationService.Result result;
        try {
            result = registrationService.register(request);
        } catch (UserRegistrationService.RegistrationException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", e.getMessage()));
        }

        UserResponseDto body = UserResponseMapper.mapUserToDto(result.user());
        return ResponseEntity.status(result.newlyCreated() ? HttpStatus.CREATED : HttpStatus.OK).body(body);
    }

    /**
     * Mirrors their UserService.login: look up by email, else phone; a missing password row counts
     * as a wrong password; identity is checked before account status so a wrong password always
     * reads as "Incorrect password." whatever state the account is in.
     */
    @PostMapping({"/login", "/session-login"})
    @Transactional
    public ResponseEntity<?> login(@Valid @RequestBody AuthenticationRequest request,
                                   HttpServletRequest httpRequest, jakarta.servlet.http.HttpServletResponse httpResponse) {
        if (!StringUtils.hasText(request.getPassword())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Password cannot be empty"));
        }

        String identifier = StringUtils.hasText(request.getEmail()) ? request.getEmail() : request.getPhone();
        User user = userLookup.findByIdentifier(identifier).orElse(null);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found."));
        }

        // This endpoint compares the hash itself rather than going through the AuthenticationManager,
        // so none of Spring Security's authentication events fire and the listener that drives
        // lockout never sees it. Without these three calls the account-level brute-force defence
        // simply would not exist here - and per-IP rate limiting does not substitute for it, since
        // an attacker spreading guesses across addresses is bounded by neither.
        if (loginAttemptService.isLocked(user.getId())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "This account is temporarily locked. Please try again later."));
        }

        String storedHash = userPasswordRepository.findByUser(user).map(UserPassword::getPassword).orElse(null);
        if (storedHash == null || !passwordEncoder.matches(request.getPassword(), storedHash)) {
            loginAttemptService.recordFailure(user.getId(), identifier, httpRequest.getRemoteAddr());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Incorrect password."));
        }
        if (Boolean.TRUE.equals(user.getDeleted())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "This account has been deleted."));
        }
        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "This account has been disabled."));
        }

        loginAttemptService.recordSuccess(user.getId());

        if (httpRequest.getRequestURI().endsWith("/session-login")) {
            // Signup already has the new user's credentials. Establish the browser
            // session after the same password/status/lockout checks as normal login,
            // then let the SPA obtain its own tokens through Authorization Code + PKCE.
            if (httpRequest.getSession(false) != null) httpRequest.changeSessionId();
            sessionLoginHelper.establishSessionAndResolveRedirect(
                    appUserDetailsService.loadUserByUsername(identifier), httpRequest, httpResponse);
            return ResponseEntity.ok(Map.of("authenticated", true));
        }
        Map<String, Object> tokens = tokenIssuanceService.issueTokens(user);
        LoginResponse response = new LoginResponse((String) tokens.get("access_token"), UserMapper.toDto(user));
        response.setRefreshToken((String) tokens.get("refresh_token"));
        // Theirs reports whether this is the first login of the server day, which drives the daily
        // bonus UI. That stamp is written by SuperMeBE's own login and interceptor; this server does
        // not touch lastLoginDate (see ARCHITECTURE.md section 18), so it cannot honestly claim a
        // first-of-day and says false rather than guessing.
        response.setFirstLoggedForTheDay(false);
        return ResponseEntity.ok(response);
    }
}
