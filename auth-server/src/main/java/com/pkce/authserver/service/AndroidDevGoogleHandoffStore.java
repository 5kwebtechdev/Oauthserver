package com.pkce.authserver.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Optional;

/** Persists short-lived Android Google security transactions and one-use handoff tickets. */
@Service
public class AndroidDevGoogleHandoffStore {

    private final JdbcTemplate jdbc;

    public AndroidDevGoogleHandoffStore(@Qualifier("dataSource") DataSource dataSource) {
        this.jdbc = new JdbcTemplate(dataSource);
    }

    public void createTransaction(String transactionId, LoginAttempt attempt, Instant expiresAt) {
        jdbc.update("DELETE FROM android_dev_google_handoff WHERE expires_at < CURRENT_TIMESTAMP(6)");
        jdbc.update("""
                INSERT INTO android_dev_google_handoff
                    (token_hash, purpose, client_id, redirect_uri, code_challenge, google_nonce,
                     oidc_nonce, state_value, expires_at, created_at)
                VALUES (?, 'TRANSACTION', ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(6))
                """, hash(transactionId), attempt.clientId(), attempt.redirectUri(), attempt.codeChallenge(),
                attempt.googleNonce(), attempt.oidcNonce(), attempt.state(), Timestamp.from(expiresAt));
    }

    public Optional<LoginAttempt> findTransaction(String transactionId) {
        return find(transactionId, "TRANSACTION");
    }

    /** Atomically changes a verified transaction into an opaque single-use ticket. */
    public Optional<LoginAttempt> issueTicket(String transactionId, String ticket, Instant ticketExpiresAt) {
        int updated = jdbc.update("""
                UPDATE android_dev_google_handoff
                   SET token_hash = ?, purpose = 'TICKET', expires_at = ?, created_at = CURRENT_TIMESTAMP(6)
                 WHERE token_hash = ? AND purpose = 'TRANSACTION' AND consumed_at IS NULL
                   AND expires_at > CURRENT_TIMESTAMP(6)
                """, hash(ticket), Timestamp.from(ticketExpiresAt), hash(transactionId));
        return updated == 1 ? find(ticket, "TICKET", true) : Optional.empty();
    }

    /** A ticket can be consumed exactly once across all server instances. */
    public Optional<LoginAttempt> consumeTicket(String ticket) {
        int updated = jdbc.update("""
                UPDATE android_dev_google_handoff SET consumed_at = CURRENT_TIMESTAMP(6)
                 WHERE token_hash = ? AND purpose = 'TICKET' AND consumed_at IS NULL
                   AND expires_at > CURRENT_TIMESTAMP(6)
                """, hash(ticket));
        return updated == 1 ? find(ticket, "TICKET", true) : Optional.empty();
    }

    public boolean cancelTransaction(String transactionId) {
        return jdbc.update("""
                UPDATE android_dev_google_handoff SET consumed_at = CURRENT_TIMESTAMP(6)
                 WHERE token_hash = ? AND purpose = 'TRANSACTION' AND consumed_at IS NULL
                   AND expires_at > CURRENT_TIMESTAMP(6)
                """, hash(transactionId)) == 1;
    }

    private Optional<LoginAttempt> find(String token, String purpose) {
        return find(token, purpose, false);
    }

    private Optional<LoginAttempt> find(String token, String purpose, boolean includeConsumed) {
        String consumedPredicate = includeConsumed ? "" : " AND consumed_at IS NULL";
        return jdbc.query("""
                SELECT client_id, redirect_uri, code_challenge, google_nonce, oidc_nonce, state_value
                  FROM android_dev_google_handoff
                 WHERE token_hash = ? AND purpose = ?
                   AND expires_at > CURRENT_TIMESTAMP(6)
                """ + consumedPredicate, rs -> rs.next()
                ? Optional.of(new LoginAttempt(rs.getString("client_id"), rs.getString("redirect_uri"),
                    rs.getString("code_challenge"), rs.getString("google_nonce"),
                    rs.getString("oidc_nonce"), rs.getString("state_value")))
                : Optional.empty(), hash(token), purpose);
    }

    private static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }

    public record LoginAttempt(String clientId, String redirectUri, String codeChallenge,
                               String googleNonce, String oidcNonce, String state) { }
}
