package com.pkce.authserver;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.service.GoogleIdentityVerifier;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.supermedev.repository.UserDevRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.SimpleTransactionStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GoogleClientRoutingTest {
    private final SupermeUserRepository prod = mock(SupermeUserRepository.class);
    private final UserDevRepository dev = mock(UserDevRepository.class);
    private final PlatformTransactionManager prodTx = mock(PlatformTransactionManager.class);
    private final PlatformTransactionManager devTx = mock(PlatformTransactionManager.class);
    private final GoogleIdentityVerifier verifier = mock(GoogleIdentityVerifier.class);
    private final AdminLoginContextFilter filter = new AdminLoginContextFilter("admin", "admin-dev", "apk-dev");
    private GoogleLoginService service;

    @BeforeEach
    void setup() {
        var properties = new SupermeProperties();
        properties.setWritesEnabled(true);
        service = new GoogleLoginService(verifier, prod, properties, dev, prodTx, devTx);
        when(prodTx.getTransaction(any(TransactionDefinition.class))).thenReturn(new SimpleTransactionStatus());
        when(devTx.getTransaction(any(TransactionDefinition.class))).thenReturn(new SimpleTransactionStatus());
        when(verifier.verify("proof")).thenReturn(Jwt.withTokenValue("proof").header("alg", "RS256")
                .subject("google-sub").claim("email", "same@example.test").build());
    }

    private User account(long id) {
        var user = new User();
        user.setId(id);
        user.setEmail("same@example.test");
        user.setEnabled(true);
        return user;
    }

    private MockHttpServletRequest request(String client) {
        var request = new MockHttpServletRequest("POST", "/api/auth/google-login");
        request.setServletPath("/api/auth/google-login");
        if (client != null) request.setParameter("client_id", client);
        return request;
    }

    @Test
    void directDevGoogleLoginFindsAndLinksOnlyDevAccount() throws Exception {
        User devAccount = account(22);
        when(dev.findByEmail("same@example.test")).thenReturn(Optional.of(devAccount));
        filter.doFilter(request("apk-dev"), new MockHttpServletResponse(), (req, res) -> {
            assertThat(service.verifyAndUpsert("proof").user).isSameAs(devAccount);
        });
        verify(dev).save(devAccount);
        verify(devTx).commit(any());
        verifyNoInteractions(prod, prodTx);
        assertThat(AdminLoginContextFilter.currentAdminClient()).isEqualTo(AdminLoginContextFilter.AdminClient.NONE);
    }

    @Test
    void missingDevAccountNeverFallsBackToProductionAndClearsContext() {
        assertThatThrownBy(() -> filter.doFilter(request("apk-dev"), new MockHttpServletResponse(), (req, res) -> {
            service.verifyAndUpsert("proof");
        })).isInstanceOf(GoogleLoginService.AccountNotRegisteredException.class);
        verifyNoInteractions(prod, prodTx);
        verify(devTx).rollback(any());
        assertThat(AdminLoginContextFilter.currentAdminClient()).isEqualTo(AdminLoginContextFilter.AdminClient.NONE);
    }

    @Test
    void savedAuthorizationRoutesHostedGoogleLoginToDev() throws Exception {
        var authorization = new MockHttpServletRequest("GET", "/oauth2/authorize");
        authorization.setParameter("client_id", "apk-dev");
        new HttpSessionRequestCache().saveRequest(authorization, new MockHttpServletResponse());
        var login = request(null);
        login.setSession(authorization.getSession());
        when(dev.findByEmail("same@example.test")).thenReturn(Optional.of(account(22)));
        filter.doFilter(login, new MockHttpServletResponse(), (req, res) -> service.verifyAndUpsert("proof"));
        verifyNoInteractions(prod, prodTx);
        verify(dev).findByEmail("same@example.test");
    }

    @Test
    void productionLoginRemainsInProduction() throws Exception {
        when(prod.findByEmail("same@example.test")).thenReturn(Optional.of(account(11)));
        filter.doFilter(request("production-client"), new MockHttpServletResponse(), (req, res) -> {
            assertThat(service.verifyAndUpsert("proof").user.getId()).isEqualTo(11);
        });
        verifyNoInteractions(dev, devTx);
        verify(prodTx).commit(any());
    }
}
