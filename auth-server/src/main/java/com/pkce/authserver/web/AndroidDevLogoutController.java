package com.pkce.authserver.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

/**
 * Logout endpoint reserved for the separate native Android DEV OAuth client. It deliberately
 * leaves the existing /apklogout website flow untouched and only ends authorizations belonging
 * to the configured Android client.
 */
@RestController
@RequiredArgsConstructor
public class AndroidDevLogoutController {

    private static final OAuth2TokenType ID_TOKEN = new OAuth2TokenType("id_token");

    private final OAuth2AuthorizationService authorizationService;
    private final RegisteredClientRepository registeredClientRepository;

    @Value("${app.frontend.android-dev-client-id:}")
    private String androidDevClientId;

    @Value("${app.security.login-url:https://auth.supermeapp.com/login}")
    private String loginUrl;

    @GetMapping("/android-dev-logout")
    public ResponseEntity<Void> logout(
            @RequestParam(name = "id_token_hint", required = false) String idTokenHint,
            @RequestParam(name = "post_logout_redirect_uri", required = false) String postLogoutRedirectUri,
            HttpServletRequest request) {
        RegisteredClient client = findAndroidClient();
        endAndroidAuthorization(idTokenHint, client);
        endBrowserSession(request);
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(resolveRedirect(client, postLogoutRedirectUri))
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .build();
    }

    private RegisteredClient findAndroidClient() {
        if (!StringUtils.hasText(androidDevClientId)) return null;
        return registeredClientRepository.findByClientId(androidDevClientId);
    }

    private void endAndroidAuthorization(String idTokenHint, RegisteredClient client) {
        if (!StringUtils.hasText(idTokenHint) || client == null) return;
        try {
            OAuth2Authorization authorization = authorizationService.findByToken(idTokenHint, ID_TOKEN);
            if (authorization != null && client.getId().equals(authorization.getRegisteredClientId())) {
                authorizationService.remove(authorization);
            }
        } catch (RuntimeException ignored) {
            // Logout remains a clean redirect; never expose token or authorization details.
        }
    }

    private static void endBrowserSession(HttpServletRequest request) {
        try {
            HttpSession session = request.getSession(false);
            if (session != null) session.invalidate();
        } catch (RuntimeException ignored) {
            // The app also clears its local secure token set after the browser redirect.
        }
    }

    private URI resolveRedirect(RegisteredClient client, String requested) {
        if (client != null && StringUtils.hasText(requested)
                && client.getPostLogoutRedirectUris().contains(requested)) {
            try {
                return URI.create(requested);
            } catch (IllegalArgumentException ignored) {
                // Fall back to the auth-server login page below.
            }
        }
        return URI.create(loginUrl);
    }
}
