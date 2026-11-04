package com.pkce.authserver.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GoogleIdentityVerifierTest {

    private static final String AUDIENCE = "google-server-client.apps.googleusercontent.com";
    private static final String AZP = "google-android-client.apps.googleusercontent.com";
    private static final String NONCE = "nonce_123456789012345678901234";

    private JwtDecoder decoder;
    private GoogleIdentityVerifier verifier;
    private Jwt token;

    @BeforeEach
    void setUp() {
        decoder = mock(JwtDecoder.class);
        verifier = new GoogleIdentityVerifier(decoder);
        token = token(List.of(AUDIENCE), AZP, NONCE);
        when(decoder.decode("google-id-token")).thenReturn(token);
    }

    @Test
    void acceptsOnlyExpectedNativeAudienceAuthorizedPartyAndNonce() {
        assertThat(verifier.verifyAndroidDev("google-id-token", AUDIENCE, AZP, NONCE)).isSameAs(token);
    }

    @Test
    void rejectsUnexpectedOrAdditionalAudience() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE, "other-client"), AZP, NONCE));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, AZP, NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsWrongAuthorizedPartyAndNonce() {
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, "wrong-azp", NONCE))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, AZP, "wrong-nonce"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsUnverifiedEmail() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE), AZP, NONCE, false));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, AZP, NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    private static Jwt token(List<String> audience, String azp, String nonce) {
        return token(audience, azp, nonce, true);
    }

    private static Jwt token(List<String> audience, String azp, String nonce, boolean emailVerified) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("google-id-token")
                .header("alg", "RS256")
                .issuer("https://accounts.google.com")
                .subject("google-subject")
                .audience(audience)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .claim("email", "person@example.com")
                .claim("email_verified", emailVerified)
                .claim("azp", azp)
                .claim("nonce", nonce)
                .build();
    }
}
