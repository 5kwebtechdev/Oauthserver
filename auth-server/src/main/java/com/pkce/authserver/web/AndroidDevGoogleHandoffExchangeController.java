package com.pkce.authserver.web;

import com.pkce.authserver.service.AndroidDevGoogleHandoffStore;
import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.GoogleNonceReplayGuard;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.security.Principal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Redeems the hosted CAPTCHA ticket after native Google sign-in; intentionally Android DEV only. */
@RestController
@RequiredArgsConstructor
public class AndroidDevGoogleHandoffExchangeController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_LIFETIME_SECONDS = 60;
    private static final Set<String> SCOPES = Set.of(
            OidcScopes.OPENID, OidcScopes.PROFILE, "notes.read", "notes.write");

    private final AndroidDevGoogleHandoffStore handoffs;
    private final GoogleLoginService googleLoginService;
    private final AppUserDetailsService userDetailsService;
    private final RegisteredClientRepository clients;
    private final OAuth2AuthorizationService authorizations;
    private final GoogleNonceReplayGuard nonceReplayGuard;

    @Value("${app.security.android-dev-client.id:}")
    private String androidClientId;
    @Value("${app.google.android-dev-audience:}")
    private String googleAudience;
    @Value("${app.google.android-dev-authorized-party:}")
    private String googleAuthorizedParty;
    @Value("${app.security.issuer}")
    private String issuer;

    @PostMapping("/v1/auth/android-dev/google/exchange")
    public ResponseEntity<Map<String, Object>> exchange(@Valid @RequestBody ExchangeRequest request) {
        if (!StringUtils.hasText(androidClientId) || !androidClientId.equals(request.clientId())) {
            return error(HttpStatus.BAD_REQUEST, "invalid_client", "Android DEV client is not available.");
        }
        if (!StringUtils.hasText(googleAudience) || !StringUtils.hasText(googleAuthorizedParty)) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "google_client_not_ready",
                    "Native Google sign-in is not configured for this Android client.");
        }
        RegisteredClient client = clients.findByClientId(androidClientId);
        if (!isReadyPublicClient(client)) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "client_not_ready",
                    "Android DEV OAuth client is not configured.");
        }

        // Consume immediately before credential processing: a failed credential attempt must
        // restart the short security flow, never make a potentially replayed ticket reusable.
        var attempt = handoffs.consumeTicket(request.handoffTicket());
        if (attempt.isEmpty() || !androidClientId.equals(attempt.get().clientId())) {
            return error(HttpStatus.UNAUTHORIZED, "invalid_handoff", "The security check expired or was already used. Start again.");
        }

        GoogleLoginService.Result account;
        try {
            account = googleLoginService.verifyAndUpsertAndroidDev(request.googleIdToken(),
                    attempt.get().googleNonce(), googleAudience, googleAuthorizedParty);
        } catch (GoogleLoginService.AccountNotRegisteredException e) {
            GoogleLoginService.GoogleIdentity identity = e.getIdentity();
            return error(HttpStatus.CONFLICT, "registration_required", "Complete your SuperMe profile before signing in.",
                    Map.of("registrationRequired", true, "email", value(identity.email()),
                            "name", value(identity.name()), "pictureUrl", value(identity.pictureUrl()),
                            "requiredFields", new String[]{"gender", "dateOfBirth", "relationship"}));
        } catch (BadCredentialsException e) {
            return error(HttpStatus.UNAUTHORIZED, "invalid_google_credential",
                    "Google sign-in could not be verified. Please start again.");
        }

        UserDetails user;
        try {
            user = userDetailsService.loadVerifiedUser(account.user);
        } catch (UsernameNotFoundException e) {
            return error(HttpStatus.UNAUTHORIZED, "unusable_account", "This account cannot sign in. Contact support.");
        }

        String authorizationId = UUID.randomUUID().toString();
        if (!nonceReplayGuard.claim(attempt.get().googleNonce(), authorizationId)) {
            return error(HttpStatus.CONFLICT, "google_token_replayed", "This Google sign-in attempt was already used. Start again.");
        }
        String codeValue = randomCode();
        Instant now = Instant.now();
        OAuth2AuthorizationCode code = new OAuth2AuthorizationCode(
                codeValue, now, now.plusSeconds(CODE_LIFETIME_SECONDS));
        OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri(issuer + "/oauth2/authorize")
                .clientId(androidClientId)
                .redirectUri(attempt.get().redirectUri())
                .scopes(SCOPES)
                .additionalParameters(Map.of(
                        "code_challenge", attempt.get().codeChallenge(),
                        "code_challenge_method", "S256",
                        "nonce", attempt.get().oidcNonce()))
                .build();
        Authentication principal = org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                .authenticated(user, null, user.getAuthorities());
        OAuth2Authorization authorization = OAuth2Authorization.withRegisteredClient(client)
                .id(authorizationId)
                .principalName(principal.getName())
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizedScopes(SCOPES)
                .attribute(Principal.class.getName(), principal)
                .attribute(OAuth2AuthorizationRequest.class.getName(), authorizationRequest)
                .token(code)
                .build();
        authorizations.save(authorization);

        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .body(Map.of("code", codeValue, "expires_in", CODE_LIFETIME_SECONDS));
    }

    private static boolean isReadyPublicClient(RegisteredClient client) {
        return client != null
                && client.getClientAuthenticationMethods().stream().anyMatch(m -> "none".equals(m.getValue()))
                && client.getClientSettings().isRequireProofKey()
                && client.getAuthorizationGrantTypes().contains(AuthorizationGrantType.AUTHORIZATION_CODE)
                && client.getAuthorizationGrantTypes().contains(AuthorizationGrantType.REFRESH_TOKEN);
    }

    private static String randomCode() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
    private static String value(String value) { return value == null ? "" : value; }
    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String description) {
        return error(status, code, description, Map.of());
    }
    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code,
            String description, Map<String, Object> extras) {
        var body = new java.util.HashMap<>(extras);
        body.put("error", code); body.put("error_description", description);
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).header("Pragma", "no-cache").body(body);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> invalidRequest(Exception ignored) {
        return error(HttpStatus.BAD_REQUEST, "invalid_request", "The Android Google sign-in request is incomplete or malformed.");
    }

    public record ExchangeRequest(@NotBlank String clientId,
            @NotBlank @Size(max = 8192) String googleIdToken,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String handoffTicket) { }
}
