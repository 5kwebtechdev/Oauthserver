package com.pkce.authserver.web;

import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.service.SupermeUserDevLookup;
import com.pkce.authserver.service.TurnstileVerificationService;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import com.pkce.authserver.supermedev.repository.UserPasswordDevRepository;
import jakarta.servlet.FilterChain;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AndroidDevNativeLoginControllerTest {

    private static final String CLIENT_ID = "supermeapp-dev-android";
    private static final String REDIRECT = "superme://oauth/dev/callback";
    private static final String CHALLENGE = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

    private SupermeUserDevLookup userLookup;
    private UserPasswordDevRepository passwords;
    private PasswordEncoder encoder;
    private RegisteredClientRepository clients;
    private OAuth2AuthorizationService authorizations;
    private TurnstileVerificationService turnstile;
    private AndroidDevNativeLoginController controller;
    private RegisteredClient client;
    private User user;

    @BeforeEach
    void setUp() {
        userLookup = mock(SupermeUserDevLookup.class);
        passwords = mock(UserPasswordDevRepository.class);
        encoder = mock(PasswordEncoder.class);
        clients = mock(RegisteredClientRepository.class);
        authorizations = mock(OAuth2AuthorizationService.class);
        turnstile = mock(TurnstileVerificationService.class);
        controller = new AndroidDevNativeLoginController(userLookup, passwords, encoder, clients,
                authorizations, turnstile);
        ReflectionTestUtils.setField(controller, "androidClientId", CLIENT_ID);
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
        when(turnstile.isConfigured()).thenReturn(true);
        when(turnstile.verify("captcha", "127.0.0.1")).thenReturn(true);
        user = new User();
        user.setName("Test"); user.setEmail("test@example.com"); user.setGender("X");
        user.setDateOfBirth(LocalDate.of(2000, 1, 1)); user.setRelationship(Relationship.SELF);
        user.setEnabled(true); user.setDeleted(false);
        when(userLookup.findByIdentifier("test@example.com")).thenReturn(Optional.of(user));
        when(passwords.findByUser(user)).thenReturn(Optional.of(UserPassword.builder().user(user).password("hash").build()));
        when(encoder.matches("password", "hash")).thenReturn(true);
    }

    @Test
    void returnsShortLivedCodeBoundToAndroidClientAndPkceChallenge() throws Exception {
        var requestBody = new AndroidDevNativeLoginController.LoginRequest("test@example.com", "password", REDIRECT,
                CHALLENGE, "S256", "random-state-value-123456", "captcha");
        MockHttpServletRequest request = request();
        MockHttpServletResponse response = new MockHttpServletResponse();
        AtomicReference<Object> result = new AtomicReference<>();
        FilterChain chain = (req, res) -> result.set(controller.login(CLIENT_ID, requestBody, request));

        new AdminLoginContextFilter("", "", "", CLIENT_ID).doFilter(request, response, chain);

        @SuppressWarnings("unchecked")
        var responseEntity = (org.springframework.http.ResponseEntity<java.util.Map<String, Object>>) result.get();
        assertEquals(HttpStatus.OK, responseEntity.getStatusCode());
        assertEquals(60L, responseEntity.getBody().get("expires_in"));
        assertEquals("random-state-value-123456", responseEntity.getBody().get("state"));
        String codeValue = (String) responseEntity.getBody().get("code");
        assertNotNull(codeValue);
        assertFalse(codeValue.isBlank());

        var authorizationCaptor = org.mockito.ArgumentCaptor.forClass(OAuth2Authorization.class);
        verify(authorizations).save(authorizationCaptor.capture());
        OAuth2Authorization authorization = authorizationCaptor.getValue();
        assertEquals(client.getId(), authorization.getRegisteredClientId());
        assertEquals(Set.of("openid", "profile", "notes.read", "notes.write"), authorization.getAuthorizedScopes());
        assertEquals(codeValue, authorization.getToken(org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode.class).getToken().getTokenValue());
        assertTrue(authorization.getToken(org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationCode.class)
                .getToken().getExpiresAt().isBefore(java.time.Instant.now().plusSeconds(61)));
        OAuth2AuthorizationRequest storedRequest = authorization.getAttribute(OAuth2AuthorizationRequest.class.getName());
        assertEquals(CLIENT_ID, storedRequest.getClientId());
        assertEquals(REDIRECT, storedRequest.getRedirectUri());
        assertEquals(CHALLENGE, storedRequest.getAdditionalParameters().get("code_challenge"));
        assertEquals("S256", storedRequest.getAdditionalParameters().get("code_challenge_method"));
    }

    @Test
    void failsClosedWhenServerSideTurnstileIsNotConfigured() throws Exception {
        when(turnstile.isConfigured()).thenReturn(false);
        var requestBody = new AndroidDevNativeLoginController.LoginRequest("test@example.com", "password", REDIRECT,
                CHALLENGE, "S256", "random-state-value-123456", "captcha");
        MockHttpServletRequest request = request();
        AtomicReference<Object> result = new AtomicReference<>();
        new AdminLoginContextFilter("", "", "", CLIENT_ID).doFilter(request, new MockHttpServletResponse(),
                (req, res) -> result.set(controller.login(CLIENT_ID, requestBody, request)));

        @SuppressWarnings("unchecked")
        var responseEntity = (org.springframework.http.ResponseEntity<java.util.Map<String, String>>) result.get();
        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, responseEntity.getStatusCode());
        assertEquals("bot_protection_unavailable", responseEntity.getBody().get("error"));
        verifyNoInteractions(authorizations);
    }

    private static MockHttpServletRequest request() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/v1/auth/android-dev/login");
        request.setServletPath("/v1/auth/android-dev/login");
        request.setParameter("client_id", CLIENT_ID);
        request.setRemoteAddr("127.0.0.1");
        return request;
    }
}
