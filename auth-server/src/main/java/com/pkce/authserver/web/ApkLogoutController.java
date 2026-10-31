package com.pkce.authserver.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
 * Dedicated logout endpoint for the SuperMeApp mobile/web client on this (dev) auth server -
 * deliberately separate from /connect/logout (Spring's standard OIDC logout endpoint, shared
 * with every other environment/client). Keeping these apart means a change made here, or a bug
 * in this endpoint, can never affect /connect/logout's behavior for any other client, and
 * vice versa - same reasoning as AdminLogoutController, see its Javadoc for the full story.
 *
 * Unlike /connect/logout (which validates id_token_hint strictly via
 * OidcLogoutAuthenticationProvider - correctly so, since it also guards against a
 * superseded/replayed token being accepted - see PkceAuthorizationFlowTest), this endpoint is
 * deliberately lenient: every step is best-effort and wrapped so nothing it does can throw. A
 * stale, missing, or already-consumed id_token_hint still results in a normal redirect, never
 * an error page - the whole point being that logging out should never show the user anything.
 *
 * No per-request access-token revocation here (unlike AdminLogoutController): the mobile/web
 * app's access token is deliberately validated offline, with no per-request lookup, by design -
 * see AdminLogoutRevocationFilter's Javadoc for why that's different for the admin panel only.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class ApkLogoutController {

    private static final OAuth2TokenType ID_TOKEN = new OAuth2TokenType("id_token");

    private final OAuth2AuthorizationService authorizationService;
    private final RegisteredClientRepository registeredClientRepository;

    @Value("${app.frontend.apk-dev-client-id:}")
    private String apkDevClientId;
    @Value("${app.frontend.additional-client-id:}")
    private String additionalClientId;

    // Was hardcoded to the prod domain - see FriendlyErrorController for the same issue
    // and fix. Each environment supplies its own value via AUTH_SERVER_LOGIN_URL.
    @Value("${app.security.login-url:https://authprod.supermeapp.com/login}")
    private String loginUrl = "https://authprod.supermeapp.com/login";

    @GetMapping("/apklogout")
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

    /** Removes the stored authorization so a later /connect/logout or token lookup doesn't
     *  find it - best-effort, since this endpoint must never fail the redirect over a cleanup
     *  step. */
    private void endAuthorizationBestEffort(String idTokenHint) {
        if (idTokenHint == null || idTokenHint.isBlank()) return;
        try {
            OAuth2Authorization authorization = authorizationService.findByToken(idTokenHint, ID_TOKEN);
            if (authorization != null) {
                authorizationService.remove(authorization);
            }
        } catch (Exception e) {
            log.warn("APK logout: could not end the authorization for the given id_token_hint - "
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
            log.warn("APK logout: could not invalidate the HTTP session", e);
        }
    }

    /** Only ever redirects to a URI actually registered as a post-logout redirect for the
     *  mobile/web client - never blindly to whatever the caller passed in, which would be an
     *  open redirect. Falls back to the login page for anything else, including no match. */
    private URI resolveRedirectUri(String requested) {
        if (requested != null && !requested.isBlank()
                && (requested.equals(registeredPostLogoutUri(apkDevClientId))
                    || requested.equals(registeredPostLogoutUri(additionalClientId)))) {
            try {
                return URI.create(requested);
            } catch (IllegalArgumentException ignored) {
                // fall through to the default below
            }
        }
        return URI.create(loginUrl);
    }

    private String registeredPostLogoutUri(String clientId) {
        if (clientId == null || clientId.isBlank()) return null;
        RegisteredClient client = registeredClientRepository.findByClientId(clientId);
        if (client == null || client.getPostLogoutRedirectUris().isEmpty()) return null;
        return client.getPostLogoutRedirectUris().iterator().next();
    }
}
