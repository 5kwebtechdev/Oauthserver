package com.pkce.authserver;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.service.GoogleIdentityVerifier;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * GoogleLoginService now resolves every client against the single account database this
 * deployment talks to - there is no more dev/prod split to route between (see
 * AdminLoginContextFilter's Javadoc). What's left worth covering here is the account lookup and
 * linking behavior itself.
 */
class GoogleClientRoutingTest {
    private final SupermeUserRepository users = mock(SupermeUserRepository.class);
    private final PlatformTransactionManager tx = mock(PlatformTransactionManager.class);
    private final GoogleIdentityVerifier verifier = mock(GoogleIdentityVerifier.class);
    private GoogleLoginService service;

    @BeforeEach
    void setup() {
        var properties = new SupermeProperties();
        properties.setWritesEnabled(true);
        service = new GoogleLoginService(verifier, users, properties, tx);
        when(tx.getTransaction(any(TransactionDefinition.class))).thenReturn(new SimpleTransactionStatus());
        when(verifier.verify("proof")).thenReturn(Jwt.withTokenValue("proof").header("alg", "RS256")
                .subject("google-sub").claim("email", "same@example.test").build());
    }

    private User account(int id) {
        var user = new User();
        user.setId(id);
        user.setEmail("same@example.test");
        user.setEnabled(true);
        return user;
    }

    @Test
    void findsAndLinksTheMatchingAccountByEmail() {
        User existing = account(11);
        when(users.findByEmail("same@example.test")).thenReturn(Optional.of(existing));

        assertThat(service.verifyAndUpsert("proof").user).isSameAs(existing);

        verify(users).save(existing);
        verify(tx).commit(any());
    }

    @Test
    void missingAccountThrowsAndRollsBack() {
        when(users.findByEmail("same@example.test")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.verifyAndUpsert("proof"))
                .isInstanceOf(GoogleLoginService.AccountNotRegisteredException.class);

        verify(tx).rollback(any());
    }
}
