package com.pkce.authserver.service;

import com.pkce.authserver.security.AdminLoginContextFilter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.sql.Timestamp;
import java.time.Instant;

/**
 * Admin-panel session audit: one row per admin access token, recording when it was issued and,
 * if the admin logs out, when it stopped being usable. SuperMeBE reads this on every admin
 * request (PkceTokenVerifier.verifyAdmin) so a logged-out token is rejected immediately rather
 * than staying valid for the remainder of its ten minutes - the gap this closes is a token that
 * was copied off a shared machine being replayed after the admin signed out.
 *
 * Admin clients only, deliberately. The SuperMeApp end-user flow is untouched: it keeps
 * validating offline with no per-request lookup, so nothing in this class can affect it.
 *
 * Rows live in the ADMIN database, not this server's own: prod admins in mindfullAdmin,
 * devadmin.supermeapp.com in SuperMeBE's dev admin database, chosen per request by the same
 * client-id routing AppUserDetailsService uses (AdminLoginContextFilter). That matters because
 * SuperMeBE reads the row back through its own admin datasource, which points at exactly one of
 * those two - writing to the wrong one would silently never be seen.
 *
 * Plain JdbcTemplate rather than a JPA entity on purpose: the admin EntityManagerFactories run
 * ddl-auto=validate, so mapping an entity here would make this server refuse to start anywhere
 * the table has not been created yet (the AdminDev "missing table" deploy crash, again). Every
 * statement is also failure-tolerant - see the catch blocks - because an audit write must never
 * be what stops an admin from logging in.
 */
@Service
@Slf4j
public class AdminTokenSessionStore {

    private final JdbcTemplate prodAdmin;
    private final JdbcTemplate devAdmin;
    private final String adminClientId;
    private final String adminDevClientId;

    public AdminTokenSessionStore(@Qualifier("adminDataSource") DataSource adminDataSource,
                                  @Qualifier("adminDevDataSource") DataSource adminDevDataSource,
                                  @Value("${app.frontend.admin-client-id:}") String adminClientId,
                                  @Value("${app.frontend.admin-dev-client-id:}") String adminDevClientId) {
        this.prodAdmin = new JdbcTemplate(adminDataSource);
        this.devAdmin = new JdbcTemplate(adminDevDataSource);
        this.adminClientId = adminClientId;
        this.adminDevClientId = adminDevClientId;
    }

    /** True when this client id is one of the two admin panels - nothing else is recorded. */
    public boolean isAdminClient(String clientId) {
        return templateFor(clientId) != null;
    }

    /** Which admin database a client id belongs to, for callers that revoke by client rather than request. */
    public AdminLoginContextFilter.AdminClient adminClientFor(String clientId) {
        if (clientId == null || clientId.isBlank()) return AdminLoginContextFilter.AdminClient.NONE;
        if (!adminDevClientId.isBlank() && adminDevClientId.equals(clientId)) return AdminLoginContextFilter.AdminClient.DEV;
        if (!adminClientId.isBlank() && adminClientId.equals(clientId)) return AdminLoginContextFilter.AdminClient.PROD;
        return AdminLoginContextFilter.AdminClient.NONE;
    }

    private JdbcTemplate templateFor(String clientId) {
        if (clientId == null || clientId.isBlank()) return null;
        if (!adminDevClientId.isBlank() && adminDevClientId.equals(clientId)) return devAdmin;
        if (!adminClientId.isBlank() && adminClientId.equals(clientId)) return prodAdmin;
        return null;
    }

    private JdbcTemplate templateFor(AdminLoginContextFilter.AdminClient client) {
        return switch (client) {
            case DEV -> devAdmin;
            case PROD -> prodAdmin;
            default -> null;
        };
    }

    /**
     * Records an issued admin access token. Called for both the authorization_code and
     * refresh_token grants, so a refreshed session gets its own row and the old one keeps its
     * own history rather than being overwritten.
     */
    public void recordIssued(String clientId, String jti, String subject, Instant issuedAt, Instant expiresAt) {
        JdbcTemplate template = templateFor(clientId);
        if (template == null || jti == null || jti.isBlank()) return;
        try {
            template.update("""
                            INSERT INTO admin_token_session
                                (jti, subject, client_id, issued_at, expires_at)
                            VALUES (?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE issued_at = VALUES(issued_at)
                            """,
                    jti, subject, clientId, Timestamp.from(issuedAt), Timestamp.from(expiresAt));
        } catch (RuntimeException e) {
            // Never let the audit write fail the sign-in itself. A missing row means this token
            // cannot be revoked early, which is the pre-existing behaviour, not a new failure.
            log.warn("Could not record admin token session for client '{}' - the token is still valid, "
                    + "but logout will not be able to revoke it early", clientId, e);
        }
    }

    /** Marks an admin token unusable from now on. Returns true when a live row was revoked. */
    public boolean revoke(AdminLoginContextFilter.AdminClient client, String jti, String reason) {
        JdbcTemplate template = templateFor(client);
        if (template == null || jti == null || jti.isBlank()) return false;
        try {
            int updated = template.update("""
                            UPDATE admin_token_session
                               SET revoked_at = ?, revoked_reason = ?
                             WHERE jti = ? AND revoked_at IS NULL
                            """,
                    Timestamp.from(Instant.now()), reason, jti);
            return updated > 0;
        } catch (RuntimeException e) {
            log.warn("Could not revoke admin token session '{}'", jti, e);
            return false;
        }
    }
}
