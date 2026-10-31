package com.pkce.authserver;

import com.pkce.authserver.web.ApkLogoutController;
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
 * Unit tests for the mobile/web app's dedicated, deliberately lenient logout endpoint - see
 * the class Javadoc on ApkLogoutController for why it's separate from /connect/logout and why
 * it is intentionally less strict. The one property every test here cares about: nothing - a
 * missing token, a broken lookup, an unregistered redirect target - should ever make this
 * endpoint throw or return anything other than a 302 redirect.
 */
class ApkLogoutControllerTest {

    private OAuth2AuthorizationService authorizationService;
    private RegisteredClientRepository registeredClientRepository;
    private ApkLogoutController controller;

    @BeforeEach
    void setUp() {
        authorizationService = mock(OAuth2AuthorizationService.class);
        registeredClientRepository = mock(RegisteredClientRepository.class);
        controller = new ApkLogoutController(authorizationService, registeredClientRepository);
        ReflectionTestUtils.setField(controller, "apkDevClientId", "supermeapp-dev-web");
        ReflectionTestUtils.setField(controller, "additionalClientId", "");
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
    void aRedirectTargetMatchingTheRegisteredApkDevClientIsHonoured() {
        RegisteredClient apkClient = mock(RegisteredClient.class);
        when(apkClient.getPostLogoutRedirectUris()).thenReturn(Set.of("https://devapk.supermeapp.com/"));
        when(registeredClientRepository.findByClientId("supermeapp-dev-web")).thenReturn(apkClient);

        var response = controller.logout(null, "https://devapk.supermeapp.com/", new MockHttpServletRequest());

        assertThat(response.getHeaders().getLocation()).hasToString("https://devapk.supermeapp.com/");
    }

    @Test
    void honoursTheRequestedUriEvenWhenTheClientHasMultipleRegisteredOnes() {
        // Regression test for the real bug this was shipped for: the live apk-dev client is
        // registered with two post-logout URIs (a localhost dev one and the real one), and
        // checking only the first entry of the set (iteration order, not guaranteed) silently
        // sent a real, matching logout request to the login-page fallback instead of honouring
        // it, depending on which one happened to come first.
        RegisteredClient apkClient = mock(RegisteredClient.class);
        when(apkClient.getPostLogoutRedirectUris())
                .thenReturn(Set.of("http://localhost:4044/", "https://devapk.supermeapp.com/"));
        when(registeredClientRepository.findByClientId("supermeapp-dev-web")).thenReturn(apkClient);

        var response = controller.logout(null, "https://devapk.supermeapp.com/", new MockHttpServletRequest());

        assertThat(response.getHeaders().getLocation()).hasToString("https://devapk.supermeapp.com/");
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
    void removesTheStoredAuthorizationWhenFound() {
        OAuth2Authorization authorization = mock(OAuth2Authorization.class);
        when(authorizationService.findByToken(eq("valid-id-token"), any())).thenReturn(authorization);

        controller.logout("valid-id-token", null, new MockHttpServletRequest());

        verify(authorizationService).remove(authorization);
    }

    @Test
    void doesNotAttemptAnyAccessTokenRevocation() {
        // Unlike AdminLogoutController: the mobile/web app's access token validates offline,
        // with no per-request revocation list, by design - this endpoint must not try.
        OAuth2Authorization authorization = mock(OAuth2Authorization.class);
        when(authorizationService.findByToken(eq("valid-id-token"), any())).thenReturn(authorization);

        controller.logout("valid-id-token", null, new MockHttpServletRequest());

        verifyNoInteractions(registeredClientRepository);
    }
}
