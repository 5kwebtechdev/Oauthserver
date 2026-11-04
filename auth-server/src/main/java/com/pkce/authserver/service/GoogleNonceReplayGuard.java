package com.pkce.authserver.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * Atomically claims native Google nonces using the existing auth-owned unique hash store.
 * A domain prefix keeps these hashes separate from refresh-token hashes, and the claim survives
 * logout so a still-valid Google ID token cannot be replayed to mint a second OAuth code.
 */
@Service
public class GoogleNonceReplayGuard {

    private static final String HASH_PREFIX = "android-dev-google-nonce:";
    private final JdbcTemplate jdbcTemplate;

    @Autowired
    public GoogleNonceReplayGuard(@Qualifier("dataSource") DataSource dataSource) {
        this(new JdbcTemplate(dataSource));
    }

    GoogleNonceReplayGuard(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Returns true once per supplied nonce across requests and service instances. */
    public boolean claim(String nonce, String authorizationId) {
        try {
            jdbcTemplate.update(
                    "INSERT INTO refresh_token_history (authorization_id, token_hash) VALUES (?, ?)",
                    authorizationId, sha256(HASH_PREFIX + nonce));
            return true;
        } catch (DuplicateKeyException alreadyUsed) {
            return false;
        }
    }

    private static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
