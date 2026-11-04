package com.pkce.authserver.service;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class GoogleNonceReplayGuardTest {

    private static final String INSERT =
            "INSERT INTO refresh_token_history (authorization_id, token_hash) VALUES (?, ?)";

    @Test
    void storesOnlyDomainSeparatedHashOfNonce() throws Exception {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        doAnswer(invocation -> {
            assertThat((String) invocation.getArgument(1)).isEqualTo("auth-id");
            assertThat((String) invocation.getArgument(2)).isEqualTo(HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest("android-dev-google-nonce:nonce-value".getBytes(StandardCharsets.UTF_8))));
            return 1;
        }).when(jdbc).update(eq(INSERT), eq("auth-id"), anyString());

        assertThat(new GoogleNonceReplayGuard(jdbc).claim("nonce-value", "auth-id")).isTrue();
        verify(jdbc).update(eq(INSERT), eq("auth-id"), anyString());
    }

    @Test
    void treatsUniqueHashCollisionAsAlreadyUsed() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        when(jdbc.update(eq(INSERT), eq("auth-id"), anyString())).thenThrow(new DuplicateKeyException("duplicate"));

        assertThat(new GoogleNonceReplayGuard(jdbc).claim("nonce-value", "auth-id")).isFalse();
    }
}
