package com.pkce.authserver.security;

import com.nimbusds.jwt.JWTParser;
import com.pkce.authserver.service.AdminTokenSessionStore;
import com.pkce.authserver.service.SupermeUserInfoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AccessTokenAuthenticationContext;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2AccessTokenAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

/**
 * Adds a "user" field to every /oauth2/token response (authorization_code AND refresh_token
 * grants), alongside the standard access_token/refresh_token/expires_in/scope fields - RFC 6749
 * section 5.1 explicitly allows additional response parameters, so this doesn't violate the
 * standard, unlike changing the standard fields themselves would. Wired in via
 * OAuth2TokenEndpointConfigurer.accessTokenResponseHandler in AuthorizationServerConfig - see
 * OAuth2AccessTokenResponseAuthenticationSuccessHandler's own setAccessTokenResponseCustomizer
 * hook, which this plugs into rather than reimplementing the standard response-building logic.
 *
 * The payload is SuperMeBE's own UserDTO, the same object their /auth/login returns under "user",
 * so a client gets the same keys from either backend - see SupermeUserInfoService.
 *
 * The access token this server issues is always a JWT we just signed ourselves, so its "sub" claim
 * is read back directly (JWTParser.parse, no signature re-verification needed - this is the same
 * process that just signed it) rather than going through a JwtDecoder or re-querying the
 * OAuth2Authorization, which would be more roundabout for no extra correctness here. The subject is
 * whatever identifier the user logged in with: an email or a phone number.
 *
 * additionalParameters() on the response builder is a plain setter, not a merge - by the time this
 * customizer runs, the builder is already carrying whatever
 * OAuth2AccessTokenAuthenticationToken.getAdditionalParameters() held (id_token, for any request
 * with the openid scope). Overwriting it with just {"user": ...} would silently drop id_token and
 * break the Angular app's OIDC flow - so the existing entries are read back off the authentication
 * result and merged in, never replaced wholesale.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserInfoAccessTokenResponseCustomizer implements Consumer<OAuth2AccessTokenAuthenticationContext> {

    private final SupermeUserInfoService userInfoService;
    private final AdminTokenSessionStore adminTokenSessions;

    @Value("${app.frontend.apk-dev-client-id:}")
    private String apkDevClientId;
    @Value("${app.frontend.android-dev-client-id:}")
    private String androidDevClientId;

    @Override
    public void accept(OAuth2AccessTokenAuthenticationContext context) {
        OAuth2AccessTokenAuthenticationToken authResult = context.getAuthentication();
        String tokenValue = authResult.getAccessToken().getTokenValue();
        String clientId = authResult.getRegisteredClient().getClientId();

        // This hook is the one place every issued access token passes through, for both the
        // authorization_code and refresh_token grants, which is exactly what the admin session
        // audit needs. Admin clients only - recordIssued ignores anything else.
        recordAdminSession(clientId, tokenValue);

        // APK_DEV's User identity lives in SuperMeBE's dev database (superme_db), a genuinely
        // different physical database from the mindfullP1.User every other client reads - see
        // SupermeUserInfoService.userPayloadForDev's Javadoc for why this must branch here
        // rather than always using the prod lookup.
        boolean isApkDev = (!apkDevClientId.isBlank() && apkDevClientId.equals(clientId))
                || (!androidDevClientId.isBlank() && androidDevClientId.equals(clientId));

        String subject;
        String authProvider;
        String socialProviderId;
        try {
            var claims = JWTParser.parse(tokenValue).getJWTClaimsSet();
            subject = claims.getSubject();
            authProvider = claims.getStringClaim("authProvider");
            socialProviderId = claims.getStringClaim("socialProviderId");
        } catch (java.text.ParseException e) {
            log.warn("Could not parse the access token this server just issued to read its subject - omitting 'user' from the token response", e);
            return;
        }

        logIssuedTokens(context, authResult, clientId, subject);

        var payload = isApkDev
                ? userInfoService.userPayloadForDev(subject, authProvider, socialProviderId)
                : userInfoService.userPayloadFor(subject, authProvider, socialProviderId);
        payload.ifPresentOrElse(
                userPayload -> {
                    Map<String, Object> merged = new HashMap<>(authResult.getAdditionalParameters());
                    merged.put("user", userPayload);
                    context.getAccessTokenResponse().additionalParameters(merged);
                },
                () -> log.warn("Access token subject '{}' has no matching user - omitting 'user' from the token response", subject)
        );
    }

    /**
     * One structured audit line per issued token pair, for both the authorization_code (login)
     * and refresh_token (silent refresh) grants - lets us trace exactly which client/user got
     * what TTL and when, without ever logging a full token value.
     */
    private void logIssuedTokens(OAuth2AccessTokenAuthenticationContext context,
                                  OAuth2AccessTokenAuthenticationToken authResult,
                                  String clientId, String subject) {
        String grantType = currentGrantType();

        var accessToken = authResult.getAccessToken();
        var refreshToken = authResult.getRefreshToken();

        log.info("[TOKEN ISSUED] grant={} client={} user={} access_token={} (expires_at={}) refresh_token={} (expires_at={})",
                grantType,
                clientId,
                subject,
                mask(accessToken.getTokenValue()),
                accessToken.getExpiresAt(),
                refreshToken != null ? mask(refreshToken.getTokenValue()) : "none",
                refreshToken != null ? refreshToken.getExpiresAt() : "n/a");
    }

    /**
     * Reads the "grant_type" form parameter off the current /oauth2/token request - this
     * customizer's inputs (OAuth2AccessTokenAuthenticationContext/Token) are the same shape for
     * every grant, so the original request is the only reliable place left to tell a fresh login
     * apart from a silent refresh.
     */
    private static String currentGrantType() {
        try {
            var attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) return "unknown";
            String value = attributes.getRequest().getParameter("grant_type");
            return value != null ? value : "unknown";
        } catch (RuntimeException e) {
            return "unknown";
        }
    }

    /** First and last 10 characters only - never enough to reconstruct or replay the token. */
    private static String mask(String token) {
        if (token == null) return "none";
        if (token.length() <= 20) return token;
        return token.substring(0, 10) + "..." + token.substring(token.length() - 10);
    }

    /**
     * Audits an issued admin access token so logout can revoke it before its natural expiry.
     * Parses the token separately from the block above because that one returns early when the
     * "user" payload cannot be built - an admin principal has no SuperMeApp user row, which is
     * the normal case here, and the session must still be recorded.
     */
    private void recordAdminSession(String clientId, String tokenValue) {
        if (!adminTokenSessions.isAdminClient(clientId)) return;
        try {
            var claims = JWTParser.parse(tokenValue).getJWTClaimsSet();
            if (claims.getJWTID() == null || claims.getExpirationTime() == null) return;
            adminTokenSessions.recordIssued(
                    clientId,
                    claims.getJWTID(),
                    claims.getSubject(),
                    claims.getIssueTime() == null ? java.time.Instant.now() : claims.getIssueTime().toInstant(),
                    claims.getExpirationTime().toInstant());
        } catch (java.text.ParseException e) {
            log.warn("Could not read the admin access token's id - logout will not be able to revoke it early", e);
        }
    }
}
