package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.GoogleNonceReplayGuard;
import com.pkce.authserver.service.TurnstileVerificationService;
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
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.converter.HttpMessageNotReadableException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.security.Principal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/** Native Google ID-token exchange for the isolated Android DEV public OAuth client. */
@RestController
@RequestMapping("/v1/auth/android-dev")
@RequiredArgsConstructor
public class AndroidDevGoogleLoginController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_LIFETIME_SECONDS = 60;
    private static final Set<String> SCOPES = Set.of(
            OidcScopes.OPENID, OidcScopes.PROFILE, "notes.read", "notes.write");

    private final GoogleLoginService googleLoginService;
    private final AppUserDetailsService userDetailsService;
    private final RegisteredClientRepository clients;
    private final OAuth2AuthorizationService authorizations;
    private final GoogleNonceReplayGuard nonceReplayGuard;
    private final TurnstileVerificationService turnstile;

    @Value("${app.security.android-dev-client.id:}")
    private String androidClientId;

    @Value("${app.google.android-dev-audience:}")
    private String googleAudience;

    @Value("${app.google.android-dev-authorized-party:}")
    private String googleAuthorizedParty;

    @Value("${app.security.issuer}")
    private String issuer;

    /**
     * Issues an OAuth authorization code from a verified native Google identity. The
     * persisted atomic nonce claim prevents repeat use of the same signed Google nonce across
     * requests and service instances; the authorization code is independently one-use and
     * PKCE-verified by the normal token endpoint.
     */
    @PostMapping("/google")
    public ResponseEntity<Map<String, Object>> exchange(@Valid @RequestBody GoogleRequest request,
                                                         HttpServletRequest httpRequest) {
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
        if (!client.getRedirectUris().contains(request.redirectUri())) {
            return error(HttpStatus.BAD_REQUEST, "invalid_redirect_uri",
                    "The redirect URI is not registered for this client.");
        }
        if (!"S256".equals(request.codeChallengeMethod())
                || !request.codeChallenge().matches("^[A-Za-z0-9_-]{43}$")) {
            return error(HttpStatus.BAD_REQUEST, "invalid_pkce", "A valid S256 code challenge is required.");
        }
        if (!turnstile.isConfigured()) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "bot_protection_unavailable",
                    "Android sign-in is temporarily unavailable while the security check is configured.");
        }
        if (!turnstile.verify(request.turnstileToken(), httpRequest.getRemoteAddr())) {
            return error(HttpStatus.UNAUTHORIZED, "captcha_failed",
                    "Please complete the security check and try again.");
        }

        GoogleLoginService.Result account;
        try {
            account = googleLoginService.verifyAndUpsertAndroidDev(
                    request.googleIdToken(), request.googleNonce(), googleAudience, googleAuthorizedParty);
        } catch (GoogleLoginService.AccountNotRegisteredException e) {
            GoogleLoginService.GoogleIdentity identity = e.getIdentity();
            return error(HttpStatus.CONFLICT, "registration_required",
                    "Complete your SuperMe profile before signing in.",
                    Map.of("registrationRequired", true,
                            "email", value(identity.email()),
                            "name", value(identity.name()),
                            "pictureUrl", value(identity.pictureUrl()),
                            "requiredFields", new String[]{"gender", "dateOfBirth", "relationship"}));
        } catch (BadCredentialsException e) {
            return error(HttpStatus.UNAUTHORIZED, "invalid_google_credential",
                    "Google sign-in could not be verified. Please try again.");
        }

        UserDetails user;
        try {
            user = userDetailsService.loadVerifiedUser(account.user);
        } catch (UsernameNotFoundException e) {
            return error(HttpStatus.UNAUTHORIZED, "unusable_account",
                    "This account cannot sign in. Contact support.");
        }

        Instant now = Instant.now();
        String codeValue = randomCode();
        String authorizationId = UUID.randomUUID().toString();
        if (!nonceReplayGuard.claim(request.googleNonce(), authorizationId)) {
            return error(HttpStatus.CONFLICT, "google_token_replayed",
                    "This Google sign-in attempt has already been used. Start again.");
        }
        OAuth2AuthorizationCode code = new OAuth2AuthorizationCode(
                codeValue, now, now.plusSeconds(CODE_LIFETIME_SECONDS));
        OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri(issuer + "/oauth2/authorize")
                .clientId(androidClientId)
                .redirectUri(request.redirectUri())
                .scopes(SCOPES)
                .additionalParameters(Map.of(
                        "code_challenge", request.codeChallenge(),
                        "code_challenge_method", "S256",
                        "nonce", request.oidcNonce()))
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

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(Map.of("code", codeValue, "expires_in", CODE_LIFETIME_SECONDS));
    }

    private static boolean isReadyPublicClient(RegisteredClient client) {
        return client != null
                && client.getClientAuthenticationMethods().contains(ClientAuthenticationMethod.NONE)
                && client.getClientSettings().isRequireProofKey()
                && client.getAuthorizationGrantTypes().contains(AuthorizationGrantType.AUTHORIZATION_CODE)
                && client.getAuthorizationGrantTypes().contains(AuthorizationGrantType.REFRESH_TOKEN);
    }

    private static String randomCode() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String value(String value) {
        return value == null ? "" : value;
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String description) {
        return error(status, code, description, Map.of());
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String code,
                                                              String description, Map<String, Object> extra) {
        java.util.HashMap<String, Object> body = new java.util.HashMap<>(extra);
        body.put("error", code);
        body.put("error_description", description);
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache").body(body);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class})
    public ResponseEntity<Map<String, Object>> invalidRequest(Exception ignored) {
        return error(HttpStatus.BAD_REQUEST, "invalid_request",
                "The Google sign-in request is incomplete or malformed.");
    }

    public record GoogleRequest(
            @NotBlank @Size(max = 8192) String googleIdToken,
            @NotBlank String clientId,
            @NotBlank String redirectUri,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String codeChallenge,
            @NotBlank String codeChallengeMethod,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String googleNonce,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String oidcNonce,
            @NotBlank String turnstileToken) { }
}
