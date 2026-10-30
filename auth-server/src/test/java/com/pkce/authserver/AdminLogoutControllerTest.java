package com.pkce.authserver;

import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.service.AdminTokenSessionStore;
import com.pkce.authserver.web.AdminLogoutController;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for the admin panel's dedicated, deliberately lenient logout endpoint - see the
 * class Javadoc on AdminLogoutController for why it's separate from /connect/logout and why it
 * is intentionally less strict. The one property every test here cares about: nothing - a
 * missing token, a broken lookup, an unregistered redirect target - should ever make this
 * endpoint throw or return anything other than a 302 redirect.
 */
class AdminLogoutControllerTest {

    private OAuth2AuthorizationService authorizationService;
    private RegisteredClientRepository registeredClientRepository;
    private AdminTokenSessionStore adminTokenSessions;
    private AdminLogoutController controller;

    @BeforeEach
    void setUp() {
        authorizationService = mock(OAuth2AuthorizationService.class);
        registeredClientRepository = mock(RegisteredClientRepository.class);
        adminTokenSessions = mock(AdminTokenSessionStore.class);
        controller = new AdminLogoutController(authorizationService, registeredClientRepository, adminTokenSessions);
        ReflectionTestUtils.setField(controller, "adminClientId", "supermeadmin-web");
        ReflectionTestUtils.setField(controller, "adminDevClientId", "supermeadmin-dev-web");
    }

    @Test
    void missingIdTokenHintStillRedirectsCleanly() {
        var response = controller.logout(null, null, new MockHttpServletRequest());

        assertThat(response.getStatusCode().value()).isEqualTo(302);
        assertThat(response.getHeaders().getLocation()).hasToString("https://authprod.supermeapp.com/login");
        verifyNoInteractions(authorizationService);
    }

    @Test
    void garbageIdTokenHintDoesNotThrowAndStillRedirects() {
        when(authorizationService.findByToken(eq("not-a-real-token"), any())).thenReturn(null);

        var response = controller.logout("not-a-real-token", null, new MockHttpServletRequest());

        assertThat(response.getStatusCode().value()).isEqualTo(302);
        assertThat(response.getHeaders().getLocation()).hasToString("https://authprod.supermeapp.com/login");
    }

    @Test
    void anErrorLookingUpTheAuthorizationIsSwallowed_neverPropagates() {
        when(authorizationService.findByToken(any(), any())).thenThrow(new RuntimeException("boom - simulated DB failure"));

        var response = controller.logout("some-token", null, new MockHttpServletRequest());

        assertThat(response.getStatusCode().value()).isEqualTo(302);
    }

    @Test
    void anArbitraryUnregisteredRedirectTargetIsIgnored_fallsBackToLogin() {
        var response = controller.logout(null, "https://evil.example.com/", new MockHttpServletRequest());

        assertThat(response.getHeaders().getLocation()).hasToString("https://authprod.supermeapp.com/login");
    }

    @Test
    void aRedirectTargetMatchingTheRegisteredAdminClientIsHonoured() {
        RegisteredClient adminClient = mock(RegisteredClient.class);
        when(adminClient.getPostLogoutRedirectUris()).thenReturn(Set.of("https://admin.supermeapp.com/"));
        when(registeredClientRepository.findByClientId("supermeadmin-web")).thenReturn(adminClient);

        var response = controller.logout(null, "https://admin.supermeapp.com/", new MockHttpServletRequest());

        assertThat(response.getHeaders().getLocation()).hasToString("https://admin.supermeapp.com/");
    }

    @Test
    void endsTheSessionOnTheRequestEvenWhenThereIsNoIdTokenHint() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        MockHttpSession session = (MockHttpSession) request.getSession(true);
        assertThat(session.isInvalid()).isFalse();

        controller.logout(null, null, request);

        assertThat(session.isInvalid()).isTrue();
    }

    @Test
    void revokesTheAdminAccessTokenWhenTheAuthorizationIsFound() throws Exception {
        OAuth2Authorization authorization = mock(OAuth2Authorization.class);
        OAuth2Authorization.Token<?> accessToken = mock(OAuth2Authorization.Token.class);
        org.springframework.security.oauth2.core.OAuth2AccessToken tokenValue =
                new org.springframework.security.oauth2.core.OAuth2AccessToken(
                        org.springframework.security.oauth2.core.OAuth2AccessToken.TokenType.BEARER,
                        "eyJhbGciOiJSUzI1NiJ9.eyJqdGkiOiJhYmMxMjMifQ.sig",
                        java.time.Instant.now(), java.time.Instant.now().plusSeconds(600));
        when(accessToken.getToken()).thenReturn(tokenValue);
        when(authorization.getAccessToken()).thenReturn((OAuth2Authorization.Token) accessToken);
        when(authorization.getRegisteredClientId()).thenReturn("reg-id-1");
        when(authorizationService.findByToken(eq("valid-id-token"), any())).thenReturn(authorization);

        RegisteredClient registeredClient = mock(RegisteredClient.class);
        when(registeredClient.getClientId()).thenReturn("supermeadmin-web");
        when(registeredClientRepository.findById("reg-id-1")).thenReturn(registeredClient);
        when(adminTokenSessions.adminClientFor("supermeadmin-web")).thenReturn(AdminLoginContextFilter.AdminClient.PROD);

        controller.logout("valid-id-token", null, new MockHttpServletRequest());

        verify(adminTokenSessions).revoke(eq(AdminLoginContextFilter.AdminClient.PROD), eq("abc123"), eq("LOGOUT"));
        verify(authorizationService).remove(authorization);
    }
}
