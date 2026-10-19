package com.pkce.authserver.security;

import com.nimbusds.jwt.JWTParser;
import com.pkce.authserver.service.AdminTokenSessionStore;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.core.OAuth2Token;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Marks an admin access token revoked when its admin logs out, so SuperMeBE rejects it on the
 * next request instead of honouring it for the rest of its ten minutes.
 *
 * This exists because Spring's OidcLogoutAuthenticationProvider only READS the authorization to
 * validate id_token_hint - it never removes it. /connect/logout ends the browser session while
 * the access token it issued stays valid. The SuperMeApp end-user flow accepts that by design
 * (it validates offline, with no per-request lookup); the admin panel does not.
 *
 * A filter ahead of the logout endpoint rather than a replacement response handler: the default
 * handler is a private method inside OidcLogoutEndpointFilter, so substituting it would mean
 * re-implementing session invalidation and the post_logout_redirect_uri/state redirect, and
 * getting any of that subtly wrong breaks logging out. Running before it and continuing the
 * chain leaves all of that behaviour exactly as it was.
 *
 * Revocation is best-effort for the same reason: a logout must still complete even when the
 * audit table cannot be written.
 */
@RequiredArgsConstructor
@Slf4j
public class AdminLogoutRevocationFilter extends OncePerRequestFilter {

    private static final OAuth2TokenType ID_TOKEN = new OAuth2TokenType("id_token");

    private final OAuth2AuthorizationService authorizationService;
    private final RegisteredClientRepository registeredClientRepository;
    private final AdminTokenSessionStore adminTokenSessions;

    /**
     * Only the logout endpoint. This filter sits early in the chain (the authorization server's
     * own endpoint filters have no registered order to anchor against), so it would otherwise
     * see every /oauth2/** request.
     */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"/connect/logout".equals(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            revokeIfAdminLogout(request);
        } catch (RuntimeException e) {
            log.warn("Could not revoke the admin token on logout - the session still ends, but that "
                    + "access token stays valid until it expires", e);
        }
        filterChain.doFilter(request, response);
    }

    private void revokeIfAdminLogout(HttpServletRequest request) {
        // The logout request carries the ID token, not the access token. The access token's id
        // is reached through the stored authorization the ID token belongs to.
        String idTokenHint = request.getParameter("id_token_hint");
        if (idTokenHint == null || idTokenHint.isBlank()) return;

        OAuth2Authorization authorization = authorizationService.findByToken(idTokenHint, ID_TOKEN);
        if (authorization == null) return;

        OAuth2Authorization.Token<? extends OAuth2Token> accessToken = authorization.getAccessToken();
        if (accessToken == null) return;

        // getRegisteredClientId() is the registration's internal id, not the client_id the admin
        // panels are configured with - resolve it before deciding which admin database this is.
        RegisteredClient registeredClient = registeredClientRepository.findById(authorization.getRegisteredClientId());
        if (registeredClient == null) return;

        AdminLoginContextFilter.AdminClient target =
                adminTokenSessions.adminClientFor(registeredClient.getClientId());
        if (target == AdminLoginContextFilter.AdminClient.NONE) return;

        try {
            String jti = JWTParser.parse(accessToken.getToken().getTokenValue()).getJWTClaimsSet().getJWTID();
            if (adminTokenSessions.revoke(target, jti, "LOGOUT")) {
                log.info("Revoked admin access token on logout for client '{}'", registeredClient.getClientId());
            }
        } catch (java.text.ParseException e) {
            log.warn("Could not read the admin access token's id during logout", e);
        }
    }
}
