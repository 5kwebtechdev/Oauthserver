package com.pkce.authserver.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Decorates the JDBC-backed OAuth2AuthorizationService with refresh-token reuse
 * detection. Spring Authorization Server rotates the refresh_token_value column on
 * every refresh grant, so a replayed (already-superseded) refresh token simply fails
 * to match on lookup ("invalid_grant") - it does not, by itself, revoke the still-active
 * rotated chain. If an attacker captured an old refresh token, that is a signal of
 * compromise: this decorator records every superseded token's hash, and if one is ever
 * presented again, revokes the *current* authorization too (not just rejecting the stale
 * token), forcing the legitimate user to re-authenticate.
 */
@Slf4j
public class ReuseDetectingAuthorizationService implements OAuth2AuthorizationService {

    private final OAuth2AuthorizationService delegate;
    private final JdbcTemplate jdbcTemplate;

    public ReuseDetectingAuthorizationService(OAuth2AuthorizationService delegate, JdbcTemplate jdbcTemplate) {
        this.delegate = delegate;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void save(OAuth2Authorization authorization) {
        recordSupersededRefreshTokenIfRotating(authorization);
        delegate.save(authorization);
    }

    @Override
    public void remove(OAuth2Authorization authorization) {
        delegate.remove(authorization);
    }

    @Override
    public OAuth2Authorization findById(String id) {
        return delegate.findById(id);
    }

    @Override
    public OAuth2Authorization findByToken(String token, OAuth2TokenType tokenType) {
        boolean checkHistory = tokenType == null || OAuth2TokenType.REFRESH_TOKEN.equals(tokenType);
        if (checkHistory) {
            String authorizationId = findAuthorizationIdForSupersededToken(token);
            if (authorizationId != null) {
                log.warn("Refresh token reuse detected for authorization {} - revoking authorization chain", authorizationId);
                OAuth2Authorization compromised = delegate.findById(authorizationId);
                if (compromised != null) {
                    delegate.remove(compromised);
                }
                return null;
            }
        }
        return delegate.findByToken(token, tokenType);
    }

    private void recordSupersededRefreshTokenIfRotating(OAuth2Authorization incoming) {
        OAuth2Authorization existing = delegate.findById(incoming.getId());
        if (existing == null) {
            return;
        }
        String oldValue = tokenValue(existing);
        String newValue = tokenValue(incoming);
        if (oldValue == null || oldValue.equals(newValue)) {
            return;
        }
        try {
            jdbcTemplate.update(
                    "INSERT INTO refresh_token_history (authorization_id, token_hash) VALUES (?, ?)",
                    existing.getId(), sha256(oldValue));
        } catch (DuplicateKeyException ignored) {
            // already recorded - safe to ignore
        }
    }

    private String findAuthorizationIdForSupersededToken(String token) {
        String hash = sha256(token);
        return jdbcTemplate.query(
                "SELECT authorization_id FROM refresh_token_history WHERE token_hash = ?",
                (rs, rowNum) -> rs.getString("authorization_id"),
                hash
        ).stream().findFirst().orElse(null);
    }

    private static String tokenValue(OAuth2Authorization authorization) {
        OAuth2Authorization.Token<OAuth2RefreshToken> refreshToken = authorization.getRefreshToken();
        return refreshToken == null ? null : refreshToken.getToken().getTokenValue();
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
