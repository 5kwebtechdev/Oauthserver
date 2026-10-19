package com.pkce.authserver;

import com.pkce.authserver.service.HandoffTicketRedeemer;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabase;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseBuilder;
import org.springframework.jdbc.datasource.embedded.EmbeddedDatabaseType;

import java.sql.Timestamp;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The hand-off pass is a sign-in travelling through a URL, so the guarantees that make that
 * acceptable - spent on first use, dead on expiry, and only one winner when two requests race -
 * are the ones worth testing.
 */
class HandoffTicketRedeemerTest {

    private EmbeddedDatabase database;
    private JdbcTemplate jdbc;
    private EmbeddedDatabase devDatabase;
    private JdbcTemplate devJdbc;
    private HandoffTicketRedeemer redeemer;

    @BeforeEach
    void setup() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true).build();
        jdbc = new JdbcTemplate(database);
        devDatabase = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true).build();
        devJdbc = new JdbcTemplate(devDatabase);
        // H2-native types; the production table is MySQL (see the deployment DDL), but what is
        // under test here is the claim-once logic, which is plain SQL either way.
        jdbc.execute("""
                CREATE TABLE app_handoff_ticket (
                  id IDENTITY PRIMARY KEY,
                  ticket VARCHAR(64) NOT NULL UNIQUE,
                  user_id BIGINT NOT NULL,
                  subject VARCHAR(255) NOT NULL,
                  issued_at TIMESTAMP NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  used_at TIMESTAMP NULL,
                  redeemed_user_agent VARCHAR(512) NULL,
                  redeemed_ip VARCHAR(64) NULL
                )
                """);
        devJdbc.execute("""
                CREATE TABLE app_handoff_ticket (
                  id IDENTITY PRIMARY KEY,
                  ticket VARCHAR(64) NOT NULL UNIQUE,
                  user_id BIGINT NOT NULL,
                  subject VARCHAR(255) NOT NULL,
                  issued_at TIMESTAMP NOT NULL,
                  expires_at TIMESTAMP NOT NULL,
                  used_at TIMESTAMP NULL,
                  redeemed_user_agent VARCHAR(512) NULL,
                  redeemed_ip VARCHAR(64) NULL
                )
                """);
        // Production is MySQL, whose UTC_TIMESTAMP() is what makes the expiry check independent
        // of each connection's session time zone (see HandoffTicketRedeemer). H2 has no such
        // function, so the same SQL could not otherwise be exercised at all - this teaches H2 the
        // one function it is missing rather than testing a different query than production runs.
        String utcAlias = "CREATE ALIAS IF NOT EXISTS UTC_TIMESTAMP AS "
                + "'java.sql.Timestamp utcNow() { return java.sql.Timestamp.valueOf("
                + "java.time.LocalDateTime.now(java.time.ZoneOffset.UTC)); }'";
        jdbc.execute(utcAlias);
        devJdbc.execute(utcAlias);
        redeemer = new HandoffTicketRedeemer(jdbc, devJdbc, "apk-dev");
    }

    @AfterEach
    void shutdownDatabases() {
        database.shutdown();
        devDatabase.shutdown();
    }

    /** Seconds relative to the DATABASE's own UTC clock, matching how production writes these. */
    private void insert(String ticket, int expiresInSeconds) {
        jdbc.update("INSERT INTO app_handoff_ticket (ticket, user_id, subject, issued_at, expires_at) "
                        + "VALUES (?,?,?,UTC_TIMESTAMP(),DATEADD('SECOND', ?, UTC_TIMESTAMP()))",
                ticket, 42L, "user@example.test", expiresInSeconds);
    }

    @Test
    void redeemingAValidTicketReturnsTheSubjectToSignInAs() {
        insert("good-ticket", 60);

        assertThat(redeemer.redeem("good-ticket")).isEqualTo("user@example.test");
    }

    @Test
    void devClientRedeemsTicketFromTheDevDatabase() {
        devJdbc.update("INSERT INTO app_handoff_ticket (ticket, user_id, subject, issued_at, expires_at) VALUES (?,?,?,?,?)",
                "dev-ticket", 7L, "dev@example.test", Timestamp.from(Instant.now()),
                Timestamp.from(Instant.now().plusSeconds(60)));

        assertThat(redeemer.redeem("dev-ticket", "apk-dev")).isEqualTo("dev@example.test");
    }

    @Test
    void productionClientCannotRedeemDevDatabaseTicket() {
        devJdbc.update("INSERT INTO app_handoff_ticket (ticket, user_id, subject, issued_at, expires_at) VALUES (?,?,?,?,?)",
                "dev-only-ticket", 7L, "dev@example.test", Timestamp.from(Instant.now()),
                Timestamp.from(Instant.now().plusSeconds(60)));

        assertThatThrownBy(() -> redeemer.redeem("dev-only-ticket", "production-client"))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
        assertThat(redeemer.redeem("dev-only-ticket", "apk-dev")).isEqualTo("dev@example.test");
    }

    /**
     * The point of recording the redeeming device is that it is a DIFFERENT device from the one
     * that asked for the pass - that difference is the hand-off, and it is what makes the row
     * readable afterwards as "this account moved from there to here".
     */
    @Test
    void redeemingRecordsWhereThePassWasUsed() {
        insert("audited", 60);

        redeemer.redeem("audited", null, "Mozilla/5.0 (Macintosh) Chrome/155", "203.0.113.7");

        var row = jdbc.queryForMap(
                "SELECT redeemed_user_agent, redeemed_ip, used_at FROM app_handoff_ticket WHERE ticket = ?",
                "audited");
        assertThat(row.get("REDEEMED_USER_AGENT")).isEqualTo("Mozilla/5.0 (Macintosh) Chrome/155");
        assertThat(row.get("REDEEMED_IP")).isEqualTo("203.0.113.7");
        assertThat(row.get("USED_AT")).isNotNull();
    }

    /** A header is caller-supplied, so an overlong one must be stored, not thrown. */
    @Test
    void anAbsurdlyLongUserAgentIsTruncatedRatherThanFailingTheSignIn() {
        insert("long-ua", 60);

        assertThat(redeemer.redeem("long-ua", null, "x".repeat(5000), "203.0.113.9"))
                .isEqualTo("user@example.test");

        String stored = jdbc.queryForObject(
                "SELECT redeemed_user_agent FROM app_handoff_ticket WHERE ticket = ?", String.class, "long-ua");
        assertThat(stored).hasSize(512);
    }

    @Test
    void aTicketCannotBeRedeemedTwice() {
        insert("one-shot", 60);
        redeemer.redeem("one-shot");

        assertThatThrownBy(() -> redeemer.redeem("one-shot"))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
    }

    @Test
    void anExpiredTicketIsRefused() {
        insert("stale", -1);

        assertThatThrownBy(() -> redeemer.redeem("stale"))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
    }

    @Test
    void anUnknownTicketIsRefused() {
        assertThatThrownBy(() -> redeemer.redeem("never-issued"))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
    }

    @Test
    void aBlankTicketIsRefusedWithoutTouchingTheDatabase() {
        assertThatThrownBy(() -> redeemer.redeem("  "))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
    }

    /**
     * The user's own browser and a replay of the same copied URL can arrive together. Claiming
     * the row with a conditional UPDATE rather than checking then writing means the database
     * picks exactly one winner.
     */
    @Test
    void onlyOneOfTwoSimultaneousRedemptionsCanWin() throws Exception {
        insert("contested", 60);

        var results = new java.util.concurrent.ConcurrentLinkedQueue<Boolean>();
        var start = new java.util.concurrent.CountDownLatch(1);
        Runnable attempt = () -> {
            try {
                start.await();
                redeemer.redeem("contested");
                results.add(true);
            } catch (HandoffTicketRedeemer.TicketNotRedeemableException e) {
                results.add(false);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
        };
        Thread first = new Thread(attempt);
        Thread second = new Thread(attempt);
        first.start();
        second.start();
        start.countDown();
        first.join();
        second.join();

        assertThat(results).containsExactlyInAnyOrder(true, false);
    }
}
