package com.pkce.authserver.web;

import com.pkce.authserver.service.AndroidDevGoogleHandoffStore;
import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.GoogleNonceReplayGuard;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AndroidDevGoogleHandoffExchangeControllerTest {

    private static final String CLIENT_ID = "supermeapp-dev-android";
    private static final String REDIRECT = "superme://oauth/dev/callback";
    private static final String CHALLENGE = "A".repeat(43);
    private static final String GOOGLE_NONCE = "googleNonceValue0123456789";
    private static final String OIDC_NONCE = "oidcNonceValue0123456789";
    private static final String TICKET = "H".repeat(43);

    private AndroidDevGoogleHandoffStore handoffs;
    private GoogleLoginService googleLogin;
    private AppUserDetailsService users;
    private RegisteredClientRepository clients;
    private OAuth2AuthorizationService authorizations;
    private GoogleNonceReplayGuard replayGuard;
    private AndroidDevGoogleHandoffExchangeController controller;
    private RegisteredClient client;
    private User account;
    private AndroidDevGoogleHandoffStore.LoginAttempt attempt;

    @BeforeEach
    void setUp() {
        handoffs = mock(AndroidDevGoogleHandoffStore.class);
        googleLogin = mock(GoogleLoginService.class);
        users = mock(AppUserDetailsService.class);
        clients = mock(RegisteredClientRepository.class);
        authorizations = mock(OAuth2AuthorizationService.class);
        replayGuard = mock(GoogleNonceReplayGuard.class);
        controller = new AndroidDevGoogleHandoffExchangeController(
                handoffs, googleLogin, users, clients, authorizations, replayGuard);
        ReflectionTestUtils.setField(controller, "androidClientId", CLIENT_ID);
        ReflectionTestUtils.setField(controller, "googleAudience", "google-web-client.apps.googleusercontent.com");
        ReflectionTestUtils.setField(controller, "googleAuthorizedParty", "google-android-client.apps.googleusercontent.com");
        ReflectionTestUtils.setField(controller, "issuer", "https://auth.supermeapp.com");
        client = RegisteredClient.withId(UUID.randomUUID().toString()).clientId(CLIENT_ID)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(REDIRECT).scope("openid").scope("profile").scope("notes.read").scope("notes.write")
                .clientSettings(org.springframework.security.oauth2.server.authorization.settings.ClientSettings.builder()
                        .requireProofKey(true).build()).build();
        when(clients.findByClientId(CLIENT_ID)).thenReturn(client);
        attempt = new AndroidDevGoogleHandoffStore.LoginAttempt(CLIENT_ID, REDIRECT, CHALLENGE,
                GOOGLE_NONCE, OIDC_NONCE, "stateValue012345678901");
        when(handoffs.consumeTicket(TICKET)).thenReturn(Optional.of(attempt));
        account = new User();
        account.setEmail("android-dev-user@example.test");
        when(googleLogin.verifyAndUpsertAndroidDev("google-id-token", GOOGLE_NONCE,
                "google-web-client.apps.googleusercontent.com", "google-android-client.apps.googleusercontent.com"))
                .thenReturn(new GoogleLoginService.Result(account, false, "google-subject"));
        UserDetails details = org.springframework.security.core.userdetails.User.withUsername("android-dev-user@example.test")
                .password("unused").authorities("ROLE_USER").build();
        when(users.loadVerifiedUser(account)).thenReturn(details);
        when(replayGuard.claim(eq(GOOGLE_NONCE), anyString())).thenReturn(true);
    }

    @Test
    void redeemsTicketAndIssuesPkceBoundCodeWithOriginalOidcNonce() {
        var result = controller.exchange(new AndroidDevGoogleHandoffExchangeController.ExchangeRequest(
                CLIENT_ID, "google-id-token", TICKET));

        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(result.getHeaders().getCacheControl()).contains("no-store");
        assertThat(result.getBody()).containsEntry("expires_in", 60L);
        var saved = org.mockito.ArgumentCaptor.forClass(OAuth2Authorization.class);
        verify(authorizations).save(saved.capture());
        OAuth2AuthorizationRequest stored = saved.getValue().getAttribute(OAuth2AuthorizationRequest.class.getName());
        assertThat(stored.getRedirectUri()).isEqualTo(REDIRECT);
        assertThat(stored.getAdditionalParameters()).containsEntry("code_challenge", CHALLENGE)
                .containsEntry("code_challenge_method", "S256").containsEntry("nonce", OIDC_NONCE);
        verify(handoffs).consumeTicket(TICKET);
        verify(googleLogin).verifyAndUpsertAndroidDev("google-id-token", GOOGLE_NONCE,
                "google-web-client.apps.googleusercontent.com", "google-android-client.apps.googleusercontent.com");
    }

    @Test
    void rejectsExpiredOrReplayedTicketWithoutVerifyingGoogleToken() {
        when(handoffs.consumeTicket(TICKET)).thenReturn(Optional.empty());
        var result = controller.exchange(new AndroidDevGoogleHandoffExchangeController.ExchangeRequest(
                CLIENT_ID, "google-id-token", TICKET));
        assertThat(result.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(result.getBody()).containsEntry("error", "invalid_handoff");
        verifyNoInteractions(googleLogin, authorizations);
    }
}
