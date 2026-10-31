package com.pkce.authserver.web;

import com.nimbusds.jwt.JWTParser;
import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.service.AdminTokenSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.core.OAuth2Token;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Dedicated logout endpoint for the admin panel only - deliberately separate from
 * /connect/logout (Spring's standard OIDC logout endpoint, shared with the APK/web app
 * clients). Keeping these apart means a change made here, or a bug in this endpoint, can
 * never affect the APK/web logout flow, and vice versa.
 *
 * Unlike /connect/logout (which validates id_token_hint strictly via
 * OidcLogoutAuthenticationProvider - correctly so, since it also guards against a
 * superseded/replayed token being accepted - see PkceAuthorizationFlowTest), this endpoint
 * is deliberately lenient: every step is best-effort and wrapped so nothing it does can
 * throw. A stale, missing, or already-consumed id_token_hint still results in a normal
 * redirect to the login page, never an error page. This is a conscious simplicity-over-
 * strictness trade-off for the admin panel specifically (an internal tool, not the public
 * app), to be revisited later if the admin panel needs the same replay protection.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class AdminLogoutController {

    private static final OAuth2TokenType ID_TOKEN = new OAuth2TokenType("id_token");

    private final OAuth2AuthorizationService authorizationService;
    private final RegisteredClientRepository registeredClientRepository;
    private final AdminTokenSessionStore adminTokenSessions;

    @Value("${app.frontend.admin-client-id:}")
    private String adminClientId;
    @Value("${app.frontend.admin-dev-client-id:}")
    private String adminDevClientId;

    // Was hardcoded to the prod domain - see FriendlyErrorController for the same issue
    // and fix. Each environment supplies its own value via AUTH_SERVER_LOGIN_URL.
    @Value("${app.security.login-url:https://authprod.supermeapp.com/login}")
    private String loginUrl = "https://authprod.supermeapp.com/login";

    @GetMapping("/adminlogout")
    public ResponseEntity<Void> logout(@RequestParam(name = "id_token_hint", required = false) String id_token_hint,
                                        @RequestParam(name = "post_logout_redirect_uri", required = false) String post_logout_redirect_uri,
                                        HttpServletRequest request) {
        endAuthorizationBestEffort(id_token_hint);
        endSessionBestEffort(request);

        URI redirectTo = resolveRedirectUri(post_logout_redirect_uri);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(redirectTo)
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .build();
    }

    /** Revokes the admin access token and removes the stored authorization, same as
     *  AdminLogoutRevocationFilter does for /connect/logout - but swallows everything,
     *  since this endpoint must never fail the redirect over a cleanup step. */
    private void endAuthorizationBestEffort(String idTokenHint) {
        if (idTokenHint == null || idTokenHint.isBlank()) return;
        try {
            OAuth2Authorization authorization = authorizationService.findByToken(idTokenHint, ID_TOKEN);
            if (authorization == null) return;

            OAuth2Authorization.Token<? extends OAuth2Token> accessToken = authorization.getAccessToken();
            if (accessToken != null) {
                RegisteredClient registeredClient = registeredClientRepository.findById(authorization.getRegisteredClientId());
                if (registeredClient != null) {
                    AdminLoginContextFilter.AdminClient target =
                            adminTokenSessions.adminClientFor(registeredClient.getClientId());
                    if (target != AdminLoginContextFilter.AdminClient.NONE) {
                        String jti = JWTParser.parse(accessToken.getToken().getTokenValue()).getJWTClaimsSet().getJWTID();
                        adminTokenSessions.revoke(target, jti, "LOGOUT");
                    }
                }
            }
            authorizationService.remove(authorization);
        } catch (Exception e) {
            log.warn("Admin logout: could not end the authorization for the given id_token_hint - "
                    + "the browser session still ends and the redirect still happens", e);
        }
    }

    private void endSessionBestEffort(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
        } catch (Exception e) {
            log.warn("Admin logout: could not invalidate the HTTP session", e);
        }
    }

    /** Only ever redirects to a URI actually registered as a post-logout redirect for one of
     *  the admin clients - never blindly to whatever the caller passed in, which would be an
     *  open redirect. A client can have more than one registered post-logout URI (e.g. a
     *  localhost dev URL alongside the real one), so this checks membership in the full set,
     *  not just the first entry. Falls back to the login page for anything else, including
     *  no match. */
    private URI resolveRedirectUri(String requested) {
        if (requested != null && !requested.isBlank()
                && (isRegisteredPostLogoutUri(adminClientId, requested)
                    || isRegisteredPostLogoutUri(adminDevClientId, requested))) {
            try {
                return URI.create(requested);
            } catch (IllegalArgumentException ignored) {
                // fall through to the default below
            }
        }
        return URI.create(loginUrl);
    }

    private boolean isRegisteredPostLogoutUri(String clientId, String requested) {
        if (clientId == null || clientId.isBlank()) return false;
        RegisteredClient client = registeredClientRepository.findByClientId(clientId);
        return client != null && client.getPostLogoutRedirectUris().contains(requested);
    }
}
