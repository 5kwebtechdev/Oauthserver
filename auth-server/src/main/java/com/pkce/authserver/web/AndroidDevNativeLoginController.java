package com.pkce.authserver.web;

import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.service.SupermeUserDevLookup;
import com.pkce.authserver.service.TurnstileVerificationService;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.supermedev.repository.UserPasswordDevRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.CacheControl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.StringUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Set;

/** Native Android credential login which starts the normal OAuth authorization-code/PKCE grant. */
@RestController
@RequestMapping("/v1/auth/android-dev")
@RequiredArgsConstructor
@Validated
public class AndroidDevNativeLoginController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long CODE_LIFETIME_SECONDS = 60;
    private static final Set<String> OIDC_SCOPES = Set.of(
            OidcScopes.OPENID, OidcScopes.PROFILE, "notes.read", "notes.write");

    private final SupermeUserDevLookup userLookup;
    private final UserPasswordDevRepository passwordRepository;
    private final PasswordEncoder passwordEncoder;
    private final RegisteredClientRepository clients;
    private final OAuth2AuthorizationService authorizations;
    private final TurnstileVerificationService turnstile;

    @Value("${app.security.android-dev-client.id:}")
    private String androidClientId;

    @Value("${app.security.issuer}")
    private String issuer;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestParam("client_id") String clientId,
                                   @Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        if (!StringUtils.hasText(androidClientId) || !androidClientId.equals(clientId)) {
            return error(HttpStatus.BAD_REQUEST, "invalid_client", "Android DEV client is not available.");
        }

        RegisteredClient client = clients.findByClientId(androidClientId);
        if (client == null || !client.getClientSettings().isRequireProofKey()
                || !client.getAuthorizationGrantTypes().contains(AuthorizationGrantType.AUTHORIZATION_CODE)
                || !client.getClientAuthenticationMethods().stream().anyMatch(m -> "none".equals(m.getValue()))) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "client_not_ready", "Android DEV OAuth client is not configured.");
        }
        if (!client.getRedirectUris().contains(request.redirectUri())) {
            return error(HttpStatus.BAD_REQUEST, "invalid_redirect_uri", "The redirect URI is not registered for this client.");
        }
        if (!StringUtils.hasText(request.codeChallengeMethod()) || !"S256".equals(request.codeChallengeMethod())
                || !request.codeChallenge().matches("^[A-Za-z0-9_-]{43}$")) {
            return error(HttpStatus.BAD_REQUEST, "invalid_pkce", "A valid S256 code challenge is required.");
        }
        if (!turnstile.isConfigured()) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "bot_protection_unavailable",
                    "Android sign-in is temporarily unavailable while the security check is configured.");
        }
        if (!StringUtils.hasText(request.turnstileToken()) || !turnstile.verify(request.turnstileToken(), clientIp(httpRequest))) {
            return error(HttpStatus.UNAUTHORIZED, "captcha_failed", "Please complete the security check and try again.");
        }

        String identifier = request.identifier().trim();
        User user = userLookup.findByIdentifier(identifier).orElse(null);
        String storedHash = user == null ? null : passwordRepository.findByUser(user)
                .map(com.pkce.authserver.superme.model.UserPassword::getPassword).orElse(null);
        if (user == null || storedHash == null || !passwordEncoder.matches(request.password(), storedHash)
                || Boolean.TRUE.equals(user.getDeleted()) || !user.isEnabled()) {
            return error(HttpStatus.UNAUTHORIZED, "invalid_credentials", "The credentials are invalid or the account is unavailable.");
        }

        // This endpoint is native-only. The existing request-context filter maps this explicit
        // client to the DEV user database; reject any accidental non-DEV context before issuance.
        if (AdminLoginContextFilter.currentAdminClient() != AdminLoginContextFilter.AdminClient.APK_DEV) {
            return error(HttpStatus.BAD_REQUEST, "invalid_client", "Android DEV client context is required.");
        }

        Authentication principal = org.springframework.security.authentication.UsernamePasswordAuthenticationToken
                .authenticated(user.getEmail() != null ? user.getEmail() : user.getPhone(), null,
                        Set.of(new SimpleGrantedAuthority("ROLE_USER")));
        Instant now = Instant.now();
        String codeValue = randomCode();
        OAuth2AuthorizationCode code = new OAuth2AuthorizationCode(codeValue, now,
                now.plusSeconds(CODE_LIFETIME_SECONDS));
        OAuth2AuthorizationRequest authorizationRequest = OAuth2AuthorizationRequest.authorizationCode()
                .authorizationUri(issuer + "/oauth2/authorize")
                .clientId(androidClientId)
                .redirectUri(request.redirectUri())
                .scopes(OIDC_SCOPES)
                .state(request.state())
                .additionalParameters(Map.of(
                        "code_challenge", request.codeChallenge(),
                        "code_challenge_method", "S256"))
                .build();

        OAuth2Authorization authorization = OAuth2Authorization.withRegisteredClient(client)
                .principalName(principal.getName())
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizedScopes(OIDC_SCOPES)
                .attribute(Principal.class.getName(), principal)
                .attribute(OAuth2AuthorizationRequest.class.getName(), authorizationRequest)
                .token(code)
                .build();
        authorizations.save(authorization);

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .header("Pragma", "no-cache")
                .body(Map.of(
                "code", codeValue,
                "state", request.state(),
                "expires_in", CODE_LIFETIME_SECONDS));
    }

    private static String randomCode() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String clientIp(HttpServletRequest request) {
        return request.getRemoteAddr();
    }

    private static ResponseEntity<Map<String, String>> error(HttpStatus status, String error, String description) {
        return ResponseEntity.status(status).body(Map.of("error", error, "error_description", description));
    }

    public record LoginRequest(
            @NotBlank String identifier,
            @NotBlank String password,
            @NotBlank String redirectUri,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String codeChallenge,
            @NotBlank String codeChallengeMethod,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String state,
            @NotBlank String turnstileToken) { }
}
