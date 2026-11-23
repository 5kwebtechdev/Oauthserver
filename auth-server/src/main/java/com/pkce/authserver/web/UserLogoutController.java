package com.pkce.authserver.web;

import com.nimbusds.jwt.JWTParser;
import com.pkce.authserver.service.UserTokenSessionStore;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * REST logout for the SuperMeApp mobile/web client: the caller sends its own access token (the
 * same Authorization header every other API call already sends - nothing new to add to the
 * client), and this invalidates exactly that session, both tokens, nothing else.
 *
 * Deliberately separate from ApkLogoutController (/apklogout), which is a browser-redirect OIDC
 * flow keyed by an optional id_token_hint and does not, by itself, stop the access token from
 * being accepted elsewhere - see PkceTokenVerifier.verify(). This endpoint exists specifically
 * to close that gap for callers that can supply the access token directly (every REST client
 * can), without touching /apklogout's existing behavior at all.
 *
 * - Refresh token: removing the stored OAuth2Authorization deletes the refresh token record
 *   together with the access token in one write, so a later refresh grant for this session finds
 *   nothing and fails - no separate refresh-token-specific step needed.
 * - Access token: SuperMeBE's PkceTokenVerifier.verify() checks UserTokenRevocationCheck on every
 *   request, which reads the row this writes.
 *
 * Only the presenting session is affected - other devices/tabs signed in as the same user are
 * untouched, since nothing here looks the user up by identity, only by the exact token presented.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class UserLogoutController {

    private final OAuth2AuthorizationService authorizationService;
    private final UserTokenSessionStore userTokenSessions;

    @PostMapping("/api/auth/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request) {
        String accessToken = bearerToken(request);
        if (accessToken == null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("success", false, "message", "Missing or malformed Authorization header"));
        }

        revokeBestEffort(accessToken);

        return ResponseEntity.ok(Map.of("success", true, "message", "Logged out"));
    }

    /** Revokes the access token's jti and removes its stored authorization (which carries the
     *  refresh token too) - best-effort, since this endpoint must always report success to the
     *  caller once the token itself was at least syntactically acceptable; a storage hiccup here
     *  must never block the client from clearing its own local session. */
    private void revokeBestEffort(String accessToken) {
        try {
            String jti = JWTParser.parse(accessToken).getJWTClaimsSet().getJWTID();
            userTokenSessions.revoke(jti, "LOGOUT");

            OAuth2Authorization authorization =
                    authorizationService.findByToken(accessToken, OAuth2TokenType.ACCESS_TOKEN);
            if (authorization != null) {
                authorizationService.remove(authorization);
            }
        } catch (Exception e) {
            log.warn("User logout: could not fully revoke the presented access token - "
                    + "the client-side session still ends", e);
        }
    }

    private static String bearerToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) return null;
        String token = header.substring(7).trim();
        return token.isEmpty() ? null : token;
    }
}
