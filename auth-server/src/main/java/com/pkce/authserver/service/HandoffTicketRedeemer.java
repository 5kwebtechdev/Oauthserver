package com.pkce.authserver.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import javax.sql.DataSource;

import java.sql.Timestamp;
import java.time.Instant;

/**
 * Redeems the one-time pass SuperMeBE issues (see its HandoffTicketService) when a signed-in app
 * user opens the website in a real browser. A native app's WebView shares nothing with Chrome or
 * Safari, so the pass travelling in the URL is what carries the sign-in across that boundary.
 *
 * Both services read the same database, so this is a direct table read rather than a call back to
 * SuperMeBE - one less hop on a path a user is waiting on, and no second service to be down.
 *
 * Redemption is deliberately a single conditional UPDATE rather than a read followed by a write.
 * Two requests arriving together - the user's own browser and someone replaying a copied URL -
 * would both pass a separate "is it unused?" check and both be let in. Letting the database decide
 * the winner means exactly one can ever succeed, however many arrive at once.
 */
@Service
@Slf4j
public class HandoffTicketRedeemer {

    private final JdbcTemplate jdbcTemplate;
    private final JdbcTemplate devJdbcTemplate;
    private final String apkDevClientId;

    @Autowired
    public HandoffTicketRedeemer(JdbcTemplate jdbcTemplate,
                                 @Qualifier("primaryDevDataSource") DataSource primaryDevDataSource,
                                 @Value("${app.frontend.apk-dev-client-id:}") String apkDevClientId) {
        this.jdbcTemplate = jdbcTemplate;
        this.devJdbcTemplate = new JdbcTemplate(primaryDevDataSource);
        this.apkDevClientId = apkDevClientId;
    }

    /** Test/local constructor: both client routes share the same in-memory database. */
    public HandoffTicketRedeemer(JdbcTemplate jdbcTemplate) {
        this(jdbcTemplate, jdbcTemplate, "");
    }

    public HandoffTicketRedeemer(JdbcTemplate jdbcTemplate, JdbcTemplate devJdbcTemplate, String apkDevClientId) {
        this.jdbcTemplate = jdbcTemplate;
        this.devJdbcTemplate = devJdbcTemplate;
        this.apkDevClientId = apkDevClientId;
    }

    /** Thrown for every rejection - expired, already used, or never existed - with no detail to probe. */
    public static class TicketNotRedeemableException extends RuntimeException {
        public TicketNotRedeemableException() {
            super("This sign-in link has expired or has already been used.");
        }
    }

    /**
     * Claims the pass and returns the identifier to sign in as (an email or a phone, matching
     * what SupermeUserLookup resolves accounts by).
     */
    public String redeem(String ticket) {
        return redeem(ticket, null);
    }

    /** Routes dev-client tickets to the same dev database where SuperMeBE issued them. */
    public String redeem(String ticket, String clientId) {
        return redeem(ticket, clientId, null, null);
    }

    /**
     * Also records where the pass was used. The device that asked for it and the browser that
     * redeems it are different devices by definition, so holding both ends is what turns the row
     * into a readable hand-off: this account moved from that app to this browser, at this time.
     */
    public String redeem(String ticket, String clientId, String userAgent, String ipAddress) {
        if (ticket == null || ticket.isBlank()) throw new TicketNotRedeemableException();
        JdbcTemplate tickets = apkDevClientId != null && !apkDevClientId.isBlank()
                && apkDevClientId.equals(clientId) ? devJdbcTemplate : jdbcTemplate;

        // Claim first: only the request that actually flips used_at may proceed.
        //
        // The clock is the DATABASE's, not this process's. SuperMeBE writes expires_at through a
        // connection set to Asia/Kolkata and this server reads through one set to UTC, so a Java
        // Instant sent from here was being compared against a timestamp stored five and a half
        // hours apart - which silently kept 60-second passes usable for hours. UTC_TIMESTAMP()
        // on both sides is the same instant whatever each connection's session zone is.
        int claimed = tickets.update("""
                        UPDATE app_handoff_ticket
                           SET used_at = UTC_TIMESTAMP(),
                               redeemed_user_agent = ?,
                               redeemed_ip = ?
                         WHERE ticket = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()
                        """,
                trim(userAgent, 512), trim(ipAddress, 64), ticket);
        if (claimed != 1) throw new TicketNotRedeemableException();

        String subject = tickets.query(
                "SELECT subject FROM app_handoff_ticket WHERE ticket = ?",
                rs -> rs.next() ? rs.getString(1) : null,
                ticket);
        if (subject == null || subject.isBlank()) throw new TicketNotRedeemableException();
        return subject;
    }

    /** A client-supplied header must never be what makes the claim fail. */
    private static String trim(String value, int max) {
        if (value == null || value.isBlank()) return null;
        String trimmed = value.trim();
        return trimmed.length() <= max ? trimmed : trimmed.substring(0, max);
    }
}
