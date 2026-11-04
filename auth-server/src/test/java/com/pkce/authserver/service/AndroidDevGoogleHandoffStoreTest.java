package com.pkce.authserver.service;

import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AndroidDevGoogleHandoffStoreTest {

    private AndroidDevGoogleHandoffStore store;

    @BeforeEach
    void setUp() {
        JdbcDataSource dataSource = new JdbcDataSource();
        dataSource.setURL("jdbc:h2:mem:google_handoff;MODE=MySQL;DB_CLOSE_DELAY=-1");
        org.springframework.jdbc.core.JdbcTemplate jdbc = new org.springframework.jdbc.core.JdbcTemplate(dataSource);
        jdbc.execute("DROP TABLE IF EXISTS android_dev_google_handoff");
        jdbc.execute("""
                CREATE TABLE android_dev_google_handoff (
                  token_hash CHAR(64) PRIMARY KEY, purpose VARCHAR(16) NOT NULL,
                  client_id VARCHAR(100) NOT NULL, redirect_uri VARCHAR(500) NOT NULL,
                  code_challenge VARCHAR(128) NOT NULL, google_nonce VARCHAR(128) NOT NULL,
                  oidc_nonce VARCHAR(128) NOT NULL, state_value VARCHAR(128) NOT NULL,
                  expires_at TIMESTAMP(6) NOT NULL, created_at TIMESTAMP(6) NOT NULL,
                  consumed_at TIMESTAMP(6) NULL)
                """);
        store = new AndroidDevGoogleHandoffStore(dataSource);
    }

    @Test
    void bindsSecurityTicketToAttemptAndAllowsOnlyOneRedemption() {
        var attempt = new AndroidDevGoogleHandoffStore.LoginAttempt("supermeapp-dev-android",
                "superme://oauth/dev/callback", "A".repeat(43), "googleNonceValue0123456789",
                "oidcNonceValue0123456789", "stateValue012345678901");
        store.createTransaction("T".repeat(43), attempt, Instant.now().plusSeconds(300));

        assertThat(store.findTransaction("T".repeat(43))).contains(attempt);
        assertThat(store.issueTicket("T".repeat(43), "H".repeat(43), Instant.now().plusSeconds(120)))
                .contains(attempt);
        assertThat(store.findTransaction("T".repeat(43))).isEmpty();
        assertThat(store.consumeTicket("H".repeat(43))).contains(attempt);
        assertThat(store.consumeTicket("H".repeat(43))).isEmpty();
    }

    @Test
    void rejectsExpiredTransactionAndCannotIssueTicketFromIt() {
        store.createTransaction("T".repeat(43), new AndroidDevGoogleHandoffStore.LoginAttempt(
                "supermeapp-dev-android", "superme://oauth/dev/callback", "A".repeat(43),
                "googleNonceValue0123456789", "oidcNonceValue0123456789", "stateValue012345678901"),
                Instant.now().minusSeconds(1));

        assertThat(store.findTransaction("T".repeat(43))).isEmpty();
        assertThat(store.issueTicket("T".repeat(43), "H".repeat(43), Instant.now().plusSeconds(120))).isEmpty();
    }
}
