package com.pkce.authserver.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GoogleIdentityVerifierTest {

    private static final String AUDIENCE = "google-server-client.apps.googleusercontent.com";
    private static final String AZP = "google-android-client.apps.googleusercontent.com";
    private static final String AZP_GOOGLE_PLAY = "google-play-android-client.apps.googleusercontent.com";
    private static final Set<String> BOTH_AZP = Set.of(AZP, AZP_GOOGLE_PLAY);
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
        assertThat(verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of(AZP), NONCE)).isSameAs(token);
    }

    @Test
    void acceptsEitherApprovedAndroidClientWhenBothAreConfigured() {
        assertThat(verifier.verifyAndroidDev("google-id-token", AUDIENCE, BOTH_AZP, NONCE)).isSameAs(token);

        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE), AZP_GOOGLE_PLAY, NONCE));
        assertThat(verifier.verifyAndroidDev("google-id-token", AUDIENCE, BOTH_AZP, NONCE)).isNotNull();
    }

    @Test
    void rejectsAnUnrecognizedAzpEvenWhenTwoClientsAreApproved() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE), "unknown-client.apps.googleusercontent.com", NONCE));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, BOTH_AZP, NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsMissingAzpClaim() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE), null, NONCE));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, BOTH_AZP, NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsEmptyOrNullAuthorizedPartyAllowList() {
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of(), NONCE))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, null, NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsUnexpectedOrAdditionalAudience() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE, "other-client"), AZP, NONCE));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of(AZP), NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsWrongAuthorizedPartyAndNonce() {
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of("wrong-azp"), NONCE))
                .isInstanceOf(BadCredentialsException.class);
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of(AZP), "wrong-nonce"))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void rejectsUnverifiedEmail() {
        when(decoder.decode("google-id-token")).thenReturn(token(List.of(AUDIENCE), AZP, NONCE, false));
        assertThatThrownBy(() -> verifier.verifyAndroidDev("google-id-token", AUDIENCE, Set.of(AZP), NONCE))
                .isInstanceOf(BadCredentialsException.class);
    }

    @Test
    void parsesCommaSeparatedAuthorizedPartiesTrimmingWhitespaceAndDroppingEmptyEntries() {
        assertThat(GoogleIdentityVerifier.parseAuthorizedParties(AZP + " , " + AZP_GOOGLE_PLAY + ", ,"))
                .isEqualTo(BOTH_AZP);
        assertThat(GoogleIdentityVerifier.parseAuthorizedParties(AZP)).isEqualTo(Set.of(AZP));
        assertThat(GoogleIdentityVerifier.parseAuthorizedParties("")).isEmpty();
        assertThat(GoogleIdentityVerifier.parseAuthorizedParties(null)).isEmpty();
    }

    private static Jwt token(List<String> audience, String azp, String nonce) {
        return token(audience, azp, nonce, true);
    }

    private static Jwt token(List<String> audience, String azp, String nonce, boolean emailVerified) {
        Instant now = Instant.now();
        Jwt.Builder builder = Jwt.withTokenValue("google-id-token")
                .header("alg", "RS256")
                .issuer("https://accounts.google.com")
                .subject("google-subject")
                .audience(audience)
                .issuedAt(now)
                .expiresAt(now.plusSeconds(300))
                .claim("email", "person@example.com")
                .claim("email_verified", emailVerified)
                .claim("nonce", nonce);
        if (azp != null) {
            builder.claim("azp", azp);
        }
        return builder.build();
    }
}
