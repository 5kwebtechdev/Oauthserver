package com.pkce.resourceserver;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.util.Date;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Exercises the exact validator chain from JwtDecoderConfig directly, against
 * self-signed test tokens - no live auth-server/network needed. Covers signature,
 * issuer, audience and expiration checks independently.
 */
class JwtDecoderValidationTest {

    private static final String ISSUER = "http://localhost:9000";
    private static final String AUDIENCE = "pkce-resource-server";

    private RSAPrivateKey privateKey;
    private RSAPublicKey publicKey;
    private JwtDecoder decoder;

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair pair = generator.generateKeyPair();
        privateKey = (RSAPrivateKey) pair.getPrivate();
        publicKey = (RSAPublicKey) pair.getPublic();

        NimbusJwtDecoder nimbusDecoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(List.of(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(ISSUER),
                (jwt) -> jwt.getAudience() != null && jwt.getAudience().contains(AUDIENCE)
                        ? org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success()
                        : org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(
                                new org.springframework.security.oauth2.core.OAuth2Error("invalid_token", "bad audience", null))
        ));
        nimbusDecoder.setJwtValidator(validator);
        this.decoder = nimbusDecoder;
    }

    private String sign(RSAPrivateKey key, String issuer, String audience, Date expiry) throws JOSEException {
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("demo")
                .issuer(issuer)
                .audience(audience)
                .issueTime(new Date())
                .expirationTime(expiry)
                .claim("scope", "notes.read")
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key").build(), claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    @Test
    void validToken_decodesSuccessfully() throws Exception {
        String token = sign(privateKey, ISSUER, AUDIENCE, new Date(System.currentTimeMillis() + 60_000));
        Jwt decoded = decoder.decode(token);
        assertThat(decoded.getSubject()).isEqualTo("demo");
    }

    @Test
    void expiredToken_isRejected() throws Exception {
        String token = sign(privateKey, ISSUER, AUDIENCE, new Date(System.currentTimeMillis() - 60_000));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongIssuer_isRejected() throws Exception {
        String token = sign(privateKey, "http://evil.example.com", AUDIENCE, new Date(System.currentTimeMillis() + 60_000));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongAudience_isRejected() throws Exception {
        String token = sign(privateKey, ISSUER, "some-other-service", new Date(System.currentTimeMillis() + 60_000));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }

    @Test
    void wrongSigningKey_isRejected() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        RSAPrivateKey otherKey = (RSAPrivateKey) generator.generateKeyPair().getPrivate();
        String token = sign(otherKey, ISSUER, AUDIENCE, new Date(System.currentTimeMillis() + 60_000));
        assertThatThrownBy(() -> decoder.decode(token)).isInstanceOf(JwtException.class);
    }
}
