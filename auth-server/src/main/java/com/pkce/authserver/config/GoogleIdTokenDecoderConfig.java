package com.pkce.authserver.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.util.List;
import java.util.Set;

/**
 * Verifies the Google ID token the Angular app hands us after a client-side Google
 * Sign-In - signature (via Google's own published JWKS), expiry, issuer, and audience
 * (our Google OAuth Client ID). Only the Client ID is used here; the Client Secret plays
 * no role in validating an already-issued ID token and is never referenced anywhere in
 * this codebase.
 */
@Configuration
public class GoogleIdTokenDecoderConfig {

    private static final Set<String> VALID_ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    @Value("${app.google.client-id}")
    private String googleClientId;

    @Bean
    public JwtDecoder googleIdTokenDecoder() {
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri("https://www.googleapis.com/oauth2/v3/certs").build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(List.of(
                new JwtTimestampValidator(),
                issuerValidator(),
                audienceValidator()
        ));
        decoder.setJwtValidator(validator);
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> issuerValidator() {
        return (jwt) -> {
            String issuer = jwt.getClaimAsString("iss");
            if (VALID_ISSUERS.contains(issuer)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Unexpected issuer: " + issuer, null));
        };
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        return (jwt) -> {
            List<String> audience = jwt.getAudience();
            if (audience != null && audience.contains(googleClientId)) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Token was not issued for this app", null));
        };
    }
}
