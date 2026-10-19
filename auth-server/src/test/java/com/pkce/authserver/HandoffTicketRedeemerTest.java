package com.pkce.authserver;

import com.pkce.authserver.service.HandoffTicketRedeemer;
import org.junit.jupiter.api.BeforeEach;
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
    private HandoffTicketRedeemer redeemer;

    @BeforeEach
    void setup() {
        database = new EmbeddedDatabaseBuilder().setType(EmbeddedDatabaseType.H2)
                .generateUniqueName(true).build();
        jdbc = new JdbcTemplate(database);
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
                  used_at TIMESTAMP NULL
                )
                """);
        redeemer = new HandoffTicketRedeemer(jdbc);
    }

    private void insert(String ticket, Instant expiresAt) {
        jdbc.update("INSERT INTO app_handoff_ticket (ticket, user_id, subject, issued_at, expires_at) VALUES (?,?,?,?,?)",
                ticket, 42L, "user@example.test", Timestamp.from(Instant.now()), Timestamp.from(expiresAt));
    }

    @Test
    void redeemingAValidTicketReturnsTheSubjectToSignInAs() {
        insert("good-ticket", Instant.now().plusSeconds(60));

        assertThat(redeemer.redeem("good-ticket")).isEqualTo("user@example.test");
    }

    @Test
    void aTicketCannotBeRedeemedTwice() {
        insert("one-shot", Instant.now().plusSeconds(60));
        redeemer.redeem("one-shot");

        assertThatThrownBy(() -> redeemer.redeem("one-shot"))
                .isInstanceOf(HandoffTicketRedeemer.TicketNotRedeemableException.class);
    }

    @Test
    void anExpiredTicketIsRefused() {
        insert("stale", Instant.now().minusSeconds(1));

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
        insert("contested", Instant.now().plusSeconds(60));

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
