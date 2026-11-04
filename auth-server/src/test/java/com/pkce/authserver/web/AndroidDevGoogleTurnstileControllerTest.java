package com.pkce.authserver.web;

import com.pkce.authserver.service.AndroidDevGoogleHandoffStore;
import com.pkce.authserver.service.TurnstileVerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.mock.web.MockHttpServletRequest;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AndroidDevGoogleTurnstileControllerTest {

    private static final String CLIENT_ID = "supermeapp-dev-android";
    private static final String REDIRECT = "superme://oauth/dev/callback";
    private static final String CHALLENGE = "A".repeat(43);
    private static final String NONCE = "googleNonceValue0123456789";
    private static final String OIDC_NONCE = "oidcNonceValue0123456789";
    private static final String STATE = "stateValue012345678901";

    private AndroidDevGoogleHandoffStore handoffs;
    private RegisteredClientRepository clients;
    private TurnstileVerificationService turnstile;
    private AndroidDevGoogleTurnstileController controller;
    private AndroidDevGoogleHandoffStore.LoginAttempt attempt;

    @BeforeEach
    void setUp() {
        handoffs = mock(AndroidDevGoogleHandoffStore.class);
        clients = mock(RegisteredClientRepository.class);
        turnstile = mock(TurnstileVerificationService.class);
        controller = new AndroidDevGoogleTurnstileController(handoffs, clients, turnstile);
        ReflectionTestUtils.setField(controller, "androidClientId", CLIENT_ID);
        ReflectionTestUtils.setField(controller, "turnstileSiteKey", "public-site-key");
        ReflectionTestUtils.setField(controller, "issuer", "https://auth.supermeapp.com");
        when(turnstile.isConfigured()).thenReturn(true);
        RegisteredClient client = RegisteredClient.withId(UUID.randomUUID().toString()).clientId(CLIENT_ID)
                .clientAuthenticationMethod(org.springframework.security.oauth2.core.ClientAuthenticationMethod.NONE)
                .authorizationGrantType(org.springframework.security.oauth2.core.AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(org.springframework.security.oauth2.core.AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(REDIRECT).build();
        when(clients.findByClientId(CLIENT_ID)).thenReturn(client);
        attempt = new AndroidDevGoogleHandoffStore.LoginAttempt(CLIENT_ID, REDIRECT, CHALLENGE,
                NONCE, OIDC_NONCE, STATE);
    }

    @Test
    void initiationReturnsHostedUrlAndKeepsAttemptParametersOutOfItsQuery() {
        var result = controller.initiate(new AndroidDevGoogleTurnstileController.InitiateRequest(
                CLIENT_ID, REDIRECT, CHALLENGE, "S256", NONCE, OIDC_NONCE, STATE));
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getBody()).containsEntry("expires_in", 300L);
        String url = (String) result.getBody().get("securityCheckUrl");
        assertThat(url).startsWith("https://auth.supermeapp.com/android-dev/google-security?transaction=");
        assertThat(url).doesNotContain(CHALLENGE, NONCE, OIDC_NONCE, STATE);
        verify(handoffs).createTransaction(anyString(), any(), any());
    }

    @Test
    void successfulHostedCheckRedirectsOnlyTheOpaqueTicketAndStateToRegisteredCallback() {
        when(handoffs.findTransaction("T".repeat(43))).thenReturn(Optional.of(attempt));
        when(turnstile.verify("captcha-response", "127.0.0.1")).thenReturn(true);
        when(handoffs.issueTicket(eq("T".repeat(43)), anyString(), any())).thenAnswer(invocation -> {
            assertThat((String) invocation.getArgument(1)).hasSize(43);
            return Optional.of(attempt);
        });
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        var result = controller.completeHostedCheck("T".repeat(43), "captcha-response", request);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.FOUND);
        String location = result.getHeaders().getLocation().toString();
        assertThat(location).startsWith(REDIRECT + "?")
                .contains("android_google_ticket=")
                .contains("state=" + STATE)
                .doesNotContain("captcha-response", "google-id-token", "access_token", "refresh_token", CHALLENGE);
        verify(turnstile).verify("captcha-response", "127.0.0.1");
    }

    @Test
    void rejectedCaptchaDoesNotIssueTicketOrRedirectToApp() {
        when(handoffs.findTransaction("T".repeat(43))).thenReturn(Optional.of(attempt));
        when(turnstile.verify("bad-token", "127.0.0.1")).thenReturn(false);
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");

        var result = controller.completeHostedCheck("T".repeat(43), "bad-token", request);

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(result.getBody()).contains("Complete it again");
        verify(handoffs, never()).issueTicket(anyString(), anyString(), any());
    }
}
