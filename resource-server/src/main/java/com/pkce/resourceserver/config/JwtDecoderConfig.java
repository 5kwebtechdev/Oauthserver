package com.pkce.resourceserver.config;

import com.pkce.resourceserver.util.RsaKeyLoader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.interfaces.RSAPublicKey;
import java.util.List;

/**
 * Explicit JWT validation: signature, issuer, expiration, and audience. Signature is
 * checked against a LOCAL copy of auth-server's public key (app.resource-server.jwt.
 * public-key-path - see ARCHITECTURE.md's key-rotation runbook), not a live JWKS fetch -
 * this service only ever needs the public half of the keypair and never touches the
 * private key, which stays on auth-server alone. Same reasoning auth-server's own
 * AdminApiSecurityConfig already uses for its own /api/admin/** validation: no runtime
 * network dependency on auth-server just to verify a token's signature, and no risk of
 * ever receiving or needing the private key here. Audience checking - which Spring Boot
 * does not add automatically even with issuer-uri auto-config - is built by hand so it's
 * never missed.
 */
@Configuration
public class JwtDecoderConfig {

    @Value("${app.resource-server.jwt.public-key-path}")
    private String publicKeyPath;

    @Value("${app.resource-server.expected-issuer}")
    private String expectedIssuer;

    @Value("${app.resource-server.expected-audience}")
    private String expectedAudience;

    @Bean
    public JwtDecoder jwtDecoder() {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(publicKeyPath);
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        OAuth2TokenValidator<Jwt> validator = new org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator<>(
                List.of(
                        new JwtTimestampValidator(),
                        new JwtIssuerValidator(expectedIssuer),
                        audienceValidator()
                )
        );
        decoder.setJwtValidator(validator);
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        return (jwt) -> {
            List<String> audience = jwt.getAudience();
            if (audience != null && audience.contains(expectedAudience)) {
                return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.success();
            }
            OAuth2Error error = new OAuth2Error("invalid_token", "Required audience is missing", null);
            return org.springframework.security.oauth2.core.OAuth2TokenValidatorResult.failure(error);
        };
    }
}
