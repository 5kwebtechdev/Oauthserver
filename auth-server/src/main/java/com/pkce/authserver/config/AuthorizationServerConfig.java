package com.pkce.authserver.config;

import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.pkce.authserver.security.PkceAwarePublicClientAuthenticationConverter;
import com.pkce.authserver.security.PkceAwarePublicClientAuthenticationProvider;
import com.pkce.authserver.security.PkceAwareRefreshTokenGenerator;
import com.pkce.authserver.security.RateLimitFilter;
import com.pkce.authserver.security.UserInfoAccessTokenResponseCustomizer;
import com.pkce.authserver.service.ReuseDetectingAuthorizationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.OAuth2Token;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.authentication.PublicClientAuthenticationProvider;
import org.springframework.security.oauth2.server.authorization.web.authentication.PublicClientAuthenticationConverter;
import org.springframework.security.oauth2.server.authorization.config.annotation.web.configurers.OAuth2AuthorizationServerConfigurer;
import org.springframework.security.oauth2.server.authorization.web.authentication.OAuth2AccessTokenResponseAuthenticationSuccessHandler;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationConsentService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.token.DelegatingOAuth2TokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.JwtEncodingContext;
import org.springframework.security.oauth2.server.authorization.token.JwtGenerator;
import org.springframework.security.oauth2.server.authorization.token.OAuth2AccessTokenGenerator;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenCustomizer;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.LoginUrlAuthenticationEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.MediaTypeRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import javax.sql.DataSource;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
public class AuthorizationServerConfig {

    @Value("${app.security.issuer}")
    private String issuer;

    @Value("${app.security.cors.allowed-origins}")
    private String allowedOrigin;

    /**
     * Highest-priority filter chain: everything under /oauth2/**, /.well-known/** and
     * /connect/** (OIDC). PKCE is enforced automatically for public clients (no secret)
     * by Spring Authorization Server, and reinforced explicitly via
     * ClientSettings.requireProofKey(true) on the registered client.
     */
    @Bean
    @Order(1)
    public SecurityFilterChain authorizationServerSecurityFilterChain(HttpSecurity http, RateLimitFilter rateLimitFilter,
                                                                        RegisteredClientRepository registeredClientRepository,
                                                                        OAuth2AuthorizationService authorizationService,
                                                                        UserInfoAccessTokenResponseCustomizer userInfoAccessTokenResponseCustomizer)
            throws Exception {
        OAuth2AuthorizationServerConfigurer authorizationServerConfigurer =
                new OAuth2AuthorizationServerConfigurer();

        http
                .securityMatcher(authorizationServerConfigurer.getEndpointsMatcher())
                .with(authorizationServerConfigurer, (authorizationServer) -> authorizationServer
                        .oidc(Customizer.withDefaults())
                        // Swap in PKCE-aware converter + provider - see their Javadoc.
                        // The CONVERTER is the actual root gate: the stock one never even
                        // builds an authentication token for a public client's
                        // refresh_token request, so no provider (including the stock
                        // PublicClientAuthenticationProvider, or ours) ever runs for it.
                        .clientAuthentication((clientAuth) -> clientAuth
                                .authenticationConverters((converters) -> {
                                    converters.removeIf(PublicClientAuthenticationConverter.class::isInstance);
                                    converters.add(new PkceAwarePublicClientAuthenticationConverter());
                                })
                                .authenticationProviders((providers) -> {
                                    providers.removeIf(PublicClientAuthenticationProvider.class::isInstance);
                                    providers.add(new PkceAwarePublicClientAuthenticationProvider(
                                            registeredClientRepository, authorizationService));
                                })
                        )
                        // Adds a "user" field (the caller's own profile) to every
                        // /oauth2/token response - see UserInfoAccessTokenResponseCustomizer's
                        // Javadoc for why this is RFC-allowed and how it avoids clobbering
                        // id_token, which the default handler already populates by the time
                        // this customizer runs.
                        .tokenEndpoint((tokenEndpoint) -> {
                            OAuth2AccessTokenResponseAuthenticationSuccessHandler handler =
                                    new OAuth2AccessTokenResponseAuthenticationSuccessHandler();
                            handler.setAccessTokenResponseCustomizer(userInfoAccessTokenResponseCustomizer);
                            tokenEndpoint.accessTokenResponseHandler(handler);
                        })
                )
                // These endpoints authenticate via client_id + PKCE verifier (or client
                // secret), never cookies/sessions, so session-based CSRF protection does
                // not apply - and would otherwise 403 every public-client token request.
                .csrf(AbstractHttpConfigurer::disable)
                .cors((cors) -> cors.configurationSource(corsConfigurationSource()))
                .authorizeHttpRequests((authorize) -> authorize.anyRequest().authenticated())
                // Browser-navigated authorization requests without a session fall through
                // to the login page; API-style requests (token/jwks/userinfo) get a 401.
                .exceptionHandling((exceptions) -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                        )
                )
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public RegisteredClientRepository registeredClientRepository(DataSource dataSource) {
        return new JdbcRegisteredClientRepository(new JdbcTemplate(dataSource));
    }

    @Bean
    public OAuth2AuthorizationService authorizationService(DataSource dataSource,
                                                             RegisteredClientRepository registeredClientRepository) {
        JdbcTemplate jdbcTemplate = new JdbcTemplate(dataSource);
        JdbcOAuth2AuthorizationService delegate =
                new JdbcOAuth2AuthorizationService(jdbcTemplate, registeredClientRepository);
        return new ReuseDetectingAuthorizationService(delegate, jdbcTemplate);
    }

    @Bean
    public OAuth2AuthorizationConsentService authorizationConsentService(
            DataSource dataSource, RegisteredClientRepository registeredClientRepository) {
        return new JdbcOAuth2AuthorizationConsentService(new JdbcTemplate(dataSource), registeredClientRepository);
    }

    @Bean
    public AuthorizationServerSettings authorizationServerSettings() {
        return AuthorizationServerSettings.builder()
                .issuer(issuer)
                .build();
    }

    /**
     * Builds the token generator composite explicitly (instead of letting Spring
     * auto-assemble its default one) so the JWT customizer can be wired in directly, and
     * so PkceAwareRefreshTokenGenerator can replace the stock generator that otherwise
     * silently withholds refresh tokens from any public client - see its Javadoc, and
     * PkceAwarePublicClientAuthenticationProvider above, which together make refresh
     * tokens work for this PKCE-verified public client. Still backed by
     * ReuseDetectingAuthorizationService for rotation + reuse-detection/revocation.
     */
    @Bean
    public OAuth2TokenGenerator<OAuth2Token> tokenGenerator(JWKSource<SecurityContext> jwkSource) {
        JwtEncoder jwtEncoder = new NimbusJwtEncoder(jwkSource);
        JwtGenerator jwtGenerator = new JwtGenerator(jwtEncoder);
        jwtGenerator.setJwtCustomizer(tokenCustomizer());
        return new DelegatingOAuth2TokenGenerator(
                jwtGenerator,
                new OAuth2AccessTokenGenerator(),
                new PkceAwareRefreshTokenGenerator()
        );
    }

    /**
     * Adds the user's application roles to every issued JWT (access token and ID
     * token), and the resource-server audience to the access token only. The ID
     * token's "aud" is required by the OIDC spec to be the client_id - overwriting it
     * with the resource-server's identifier (as an earlier version of this method did)
     * makes OIDC-conformant clients reject the ID token outright (angular-oauth2-oidc's
     * processIdToken() throws on aud mismatch, which aborted this app's entire bootstrap
     * since that call runs inside APP_INITIALIZER).
     */
    private OAuth2TokenCustomizer<JwtEncodingContext> tokenCustomizer() {
        return (context) -> {
            if (context.getPrincipal().getPrincipal() instanceof UserDetails userDetails) {
                List<String> authorities = context.getPrincipal().getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .collect(Collectors.toCollection(ArrayList::new));
                List<String> roles = authorities.stream()
                        .filter(authority -> authority.startsWith("ROLE_"))
                        .collect(Collectors.toCollection(ArrayList::new));
                context.getClaims().claim("roles", roles);
                authorities.stream()
                        .filter(authority -> authority.startsWith("AUTH_PROVIDER_"))
                        .map(authority -> authority.substring("AUTH_PROVIDER_".length()).toLowerCase())
                        .findFirst()
                        .ifPresent(provider -> context.getClaims().claim("authProvider", provider));
            }
            if (OAuth2TokenType.ACCESS_TOKEN.equals(context.getTokenType())) {
                // Token metadata (including these claims) gets persisted as JSON and later
                // deserialized via Spring Security's Jackson allowlist, which rejects JDK's
                // package-private List.of(...) implementation class - use a plain ArrayList.
                context.getClaims().audience(new ArrayList<>(List.of("pkce-resource-server")));
            }
        };
    }

    private CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(java.util.Arrays.stream(allowedOrigin.split(",")).map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(false);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
