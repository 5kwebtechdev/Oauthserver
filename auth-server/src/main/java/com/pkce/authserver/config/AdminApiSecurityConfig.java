package com.pkce.authserver.config;

import com.pkce.authserver.util.RsaKeyLoader;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtIssuerValidator;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.security.interfaces.RSAPublicKey;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * Protects /api/admin/** on auth-server itself with the same kind of Bearer-token check
 * resource-server uses - this app validates its own previously-issued access tokens
 * rather than trusting the session cookie, so the Angular app can call it with the exact
 * access token it already holds for resource-server's /api/admin/notes. Validated
 * directly against the same local public key JwkConfig uses to publish /oauth2/jwks
 * (not by fetching that endpoint over HTTP) - fetching its own JWKS over the network
 * would tie the issuer URL's host:port to whatever happens to be configured, which
 * breaks in tests (random port) for no benefit, since the key is already in-process.
 */
@Configuration
public class AdminApiSecurityConfig {

    @Value("${app.security.issuer}")
    private String issuer;

    @Value("${app.security.cors.allowed-origins}")
    private String allowedOrigin;

    @Value("${app.security.jwt.public-key-path}")
    private String publicKeyPath;

    @Bean
    @Order(2)
    public SecurityFilterChain adminApiSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/admin/**")
                .csrf(AbstractHttpConfigurer::disable)
                .cors((cors) -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests((authorize) -> authorize.anyRequest().hasAuthority("ROLE_ADMIN"))
                .oauth2ResourceServer((resourceServer) -> resourceServer
                        .jwt((jwt) -> jwt.decoder(adminApiJwtDecoder()).jwtAuthenticationConverter(jwtAuthenticationConverter()))
                );

        return http.build();
    }

    private JwtDecoder adminApiJwtDecoder() {
        RSAPublicKey publicKey = RsaKeyLoader.loadPublicKey(publicKeyPath);
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey(publicKey).build();
        OAuth2TokenValidator<Jwt> validator = new DelegatingOAuth2TokenValidator<>(List.of(
                new JwtTimestampValidator(),
                new JwtIssuerValidator(issuer),
                audienceValidator()
        ));
        decoder.setJwtValidator(validator);
        return decoder;
    }

    private OAuth2TokenValidator<Jwt> audienceValidator() {
        return (jwt) -> {
            List<String> audience = jwt.getAudience();
            if (audience != null && audience.contains("pkce-resource-server")) {
                return OAuth2TokenValidatorResult.success();
            }
            return OAuth2TokenValidatorResult.failure(
                    new OAuth2Error("invalid_token", "Required audience is missing", null));
        };
    }

    private Converter<Jwt, AbstractAuthenticationToken> jwtAuthenticationConverter() {
        return (jwt) -> {
            Collection<GrantedAuthority> authorities = new ArrayList<>();
            List<String> roles = jwt.getClaimAsStringList("roles");
            if (roles != null) {
                roles.forEach(role -> authorities.add(new SimpleGrantedAuthority(role)));
            }
            return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
        };
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(java.util.Arrays.stream(allowedOrigin.split(",")).map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/admin/**", configuration);
        return source;
    }
}
