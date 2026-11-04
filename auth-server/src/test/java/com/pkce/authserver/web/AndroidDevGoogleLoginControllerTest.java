package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.GoogleLoginService;
import com.pkce.authserver.service.GoogleNonceReplayGuard;
import com.pkce.authserver.service.TurnstileVerificationService;
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

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class AndroidDevGoogleLoginControllerTest {

    private static final String CLIENT_ID = "supermeapp-dev-android";
    private static final String REDIRECT = "superme://oauth/dev/callback";
    private static final String CHALLENGE = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";
    private static final String GOOGLE_NONCE = "google_nonce_12345678901234567890";
    private static final String OIDC_NONCE = "oidc_nonce_12345678901234567890";

    private GoogleLoginService googleLogin;
    private AppUserDetailsService userDetailsService;
    private RegisteredClientRepository clients;
    private OAuth2AuthorizationService authorizations;
    private GoogleNonceReplayGuard nonceReplayGuard;
    private TurnstileVerificationService turnstile;
    private AndroidDevGoogleLoginController controller;
    private RegisteredClient client;
    private User account;

    @BeforeEach
    void setUp() {
        googleLogin = mock(GoogleLoginService.class);
        userDetailsService = mock(AppUserDetailsService.class);
        clients = mock(RegisteredClientRepository.class);
        authorizations = mock(OAuth2AuthorizationService.class);
        nonceReplayGuard = mock(GoogleNonceReplayGuard.class);
        turnstile = mock(TurnstileVerificationService.class);
        when(turnstile.isConfigured()).thenReturn(true);
        when(turnstile.verify("captcha-response", "127.0.0.1")).thenReturn(true);
        controller = new AndroidDevGoogleLoginController(googleLogin, userDetailsService, clients, authorizations,
                nonceReplayGuard, turnstile);
        ReflectionTestUtils.setField(controller, "androidClientId", CLIENT_ID);
        ReflectionTestUtils.setField(controller, "googleAudience", "google-server-client.apps.googleusercontent.com");
        ReflectionTestUtils.setField(controller, "googleAuthorizedParty", "google-android-client.apps.googleusercontent.com");
        ReflectionTestUtils.setField(controller, "issuer", "https://auth.supermeapp.com");

        client = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(CLIENT_ID)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri(REDIRECT)
                .scope("openid").scope("profile").scope("notes.read").scope("notes.write")
                .clientSettings(org.springframework.security.oauth2.server.authorization.settings.ClientSettings.builder()
                        .requireProofKey(true).build())
                .build();
        when(clients.findByClientId(CLIENT_ID)).thenReturn(client);
        account = new User();
        account.setEmail("dev-user@example.com");
        when(googleLogin.verifyAndUpsertAndroidDev("google-id-token", GOOGLE_NONCE,
                "google-server-client.apps.googleusercontent.com", "google-android-client.apps.googleusercontent.com"))
                .thenReturn(new GoogleLoginService.Result(account, false, "google-subject"));
        UserDetails details = org.springframework.security.core.userdetails.User.withUsername("dev-user@example.com")
                .password("unused").authorities("ROLE_USER").build();
        when(userDetailsService.loadVerifiedUser(account)).thenReturn(details);
        when(nonceReplayGuard.claim(eq(GOOGLE_NONCE), anyString())).thenReturn(true);
    }

    @Test
    void returnsOneMinuteCodeBoundToNativeClientRedirectPkceAndOidcNonce() {
        var response = controller.exchange(request(), servletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getCacheControl()).contains("no-store");
        assertThat(response.getBody()).containsEntry("expires_in", 60L);
        String code = (String) response.getBody().get("code");
        assertThat(code).isNotBlank();

        var saved = org.mockito.ArgumentCaptor.forClass(OAuth2Authorization.class);
        verify(authorizations).save(saved.capture());
        OAuth2Authorization authorization = saved.getValue();
        assertThat(authorization.getRegisteredClientId()).isEqualTo(client.getId());
        assertThat(authorization.getAuthorizedScopes()).containsExactlyInAnyOrder("openid", "profile", "notes.read", "notes.write");
        assertThat(authorization.getToken(org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode.class)
                .getToken().getTokenValue()).isEqualTo(code);
        assertThat(authorization.getToken(org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode.class)
                .getToken().getExpiresAt()).isBefore(java.time.Instant.now().plusSeconds(61));
        OAuth2AuthorizationRequest stored = authorization.getAttribute(OAuth2AuthorizationRequest.class.getName());
        assertThat(stored.getClientId()).isEqualTo(CLIENT_ID);
        assertThat(stored.getRedirectUri()).isEqualTo(REDIRECT);
        assertThat(stored.getAdditionalParameters()).containsEntry("code_challenge", CHALLENGE)
                .containsEntry("code_challenge_method", "S256")
                .containsEntry("nonce", OIDC_NONCE);
        verify(nonceReplayGuard).claim(eq(GOOGLE_NONCE), anyString());
    }

    @Test
    void rejectsUnregisteredRedirectBeforeGoogleVerification() {
        var response = controller.exchange(new AndroidDevGoogleLoginController.GoogleRequest(
                "google-id-token", CLIENT_ID, "superme://attacker/callback", CHALLENGE,
                "S256", GOOGLE_NONCE, OIDC_NONCE, "captcha-response"), servletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).containsEntry("error", "invalid_redirect_uri");
        verifyNoInteractions(googleLogin, authorizations);
    }

    @Test
    void rejectsReusedGoogleNonceWithoutIssuingAnotherCode() {
        when(nonceReplayGuard.claim(eq(GOOGLE_NONCE), anyString())).thenReturn(false);

        var response = controller.exchange(request(), servletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("error", "google_token_replayed");
        verify(authorizations, never()).save(any());
    }

    @Test
    void requiresConfiguredTurnstileAndVerifiedCaptchaBeforeGoogleTokenProcessing() {
        when(turnstile.isConfigured()).thenReturn(false);
        var unavailable = controller.exchange(request(), servletRequest());
        assertThat(unavailable.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(unavailable.getBody()).containsEntry("error", "bot_protection_unavailable");
        verifyNoInteractions(googleLogin);

        when(turnstile.isConfigured()).thenReturn(true);
        when(turnstile.verify("captcha-response", "127.0.0.1")).thenReturn(false);
        var rejected = controller.exchange(request(), servletRequest());
        assertThat(rejected.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(rejected.getBody()).containsEntry("error", "captcha_failed");
        verifyNoInteractions(googleLogin);
    }

    @Test
    void leavesUnknownGoogleAccountsForTheExistingProfileOnboardingFlow() {
        var identity = new GoogleLoginService.GoogleIdentity("google-subject", "new@example.com", "New User", null);
        when(googleLogin.verifyAndUpsertAndroidDev(anyString(), anyString(), anyString(), anyString()))
                .thenThrow(new GoogleLoginService.AccountNotRegisteredException(identity));

        var response = controller.exchange(request(), servletRequest());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).containsEntry("error", "registration_required")
                .containsEntry("registrationRequired", true)
                .containsEntry("email", "new@example.com");
        verifyNoInteractions(authorizations);
    }

    private static AndroidDevGoogleLoginController.GoogleRequest request() {
        return new AndroidDevGoogleLoginController.GoogleRequest(
                "google-id-token", CLIENT_ID, REDIRECT, CHALLENGE, "S256", GOOGLE_NONCE, OIDC_NONCE,
                "captcha-response");
    }

    private static jakarta.servlet.http.HttpServletRequest servletRequest() {
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        request.setRemoteAddr("127.0.0.1");
        return request;
    }
}
