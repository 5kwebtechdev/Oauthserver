package com.pkce.authserver.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.Instant;

/**
 * SuperMeApp end-user session revocation: one row per access token that has been logged out,
 * recording when it stopped being usable. SuperMeBE reads this on every app request
 * (PkceTokenVerifier.verify) so a logged-out token is rejected immediately rather than staying
 * valid for the remainder of its lifetime - same gap AdminTokenSessionStore closes for admins,
 * applied to regular app users.
 *
 * Unlike AdminTokenSessionStore, nothing is recorded at token-issuance time: a missing row
 * simply means "never revoked", so the only write this class ever makes is the logout itself.
 * This keeps every existing login/token-issuance code path completely untouched.
 *
 * Rows live in this server's own primary database (the one SuperMeBE's main datasource also
 * points at), not the admin one - SuperMeBE reads the row back through its own primary
 * datasource.
 *
 * Plain JdbcTemplate rather than a JPA entity, same reasoning as AdminTokenSessionStore: the
 * primary EntityManagerFactory runs ddl-auto=validate, so mapping an entity here would make this
 * server refuse to start if the table has not been created yet. The write is also
 * failure-tolerant - a logout must never 500 over an audit write.
 */
@Service
@Slf4j
public class UserTokenSessionStore {

    private final JdbcTemplate primary;

    public UserTokenSessionStore(DataSource dataSource) {
        this.primary = new JdbcTemplate(dataSource);
    }

    /** Marks an app user's access token unusable from now on. Best-effort: never throws. */
    public void revoke(String jti, String reason) {
        if (jti == null || jti.isBlank()) return;
        try {
            primary.update("""
                            INSERT INTO user_token_session (jti, revoked_at, revoked_reason)
                            VALUES (?, ?, ?)
                            ON DUPLICATE KEY UPDATE revoked_at = VALUES(revoked_at), revoked_reason = VALUES(revoked_reason)
                            """,
                    jti, Timestamp.from(Instant.now()), reason);
        } catch (RuntimeException e) {
            log.warn("Could not revoke user token session '{}' - the token remains valid until it expires", jti, e);
        }
    }
}
