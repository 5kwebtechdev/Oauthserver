package com.pkce.authserver.config;

import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import com.pkce.authserver.security.PkceAwarePublicClientAuthenticationConverter;
import com.pkce.authserver.security.PkceAwarePublicClientAuthenticationProvider;
import com.pkce.authserver.security.PkceAwareRefreshTokenGenerator;
import com.pkce.authserver.security.CrossClientAccountSwitchFilter;
import com.pkce.authserver.security.RateLimitFilter;
import com.pkce.authserver.security.AdminLogoutRevocationFilter;
import com.pkce.authserver.security.AppLogoutLandingFilter;
import com.pkce.authserver.service.AdminTokenSessionStore;
import com.pkce.authserver.security.UserInfoAccessTokenResponseCustomizer;
import com.pkce.authserver.service.ReuseDetectingAuthorizationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
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
import org.springframework.security.web.authentication.preauth.AbstractPreAuthenticatedProcessingFilter;
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
import org.springframework.security.web.authentication.logout.LogoutFilter;
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

    @Value("${app.security.client.id:}")
    private String appClientId;

    @Value("${app.security.additional-client.id:}")
    private String additionalAppClientId;

    @Value("${app.frontend.admin-client-id:}")
    private String adminClientId;

    @Value("${app.frontend.logout-landing-url:}")
    private String appLogoutLandingUrl;

    @Value("${app.frontend.apk-dev-client-id:}")
    private String apkDevClientId;

    @Value("${app.frontend.admin-dev-client-id:}")
    private String adminDevClientId;

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
                                                                        UserInfoAccessTokenResponseCustomizer userInfoAccessTokenResponseCustomizer,
                                                                        AdminTokenSessionStore adminTokenSessions)
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
                // Do not let the shared auth-server SSO session silently cross between app
                // and admin clients in prod or dev. Preserve the authorization request and
                // send the user to the correct login form for the target account store.
                .addFilterBefore(new CrossClientAccountSwitchFilter(appClientId, additionalAppClientId,
                                apkDevClientId, adminClientId, adminDevClientId),
                        AbstractPreAuthenticatedProcessingFilter.class)
                // Runs ahead of the OIDC logout endpoint so an admin's access token is marked
                // revoked as they log out - Spring's own logout never invalidates it. Placed
                // before the endpoint rather than replacing its response handling, which would
                // mean re-implementing session invalidation and the post-logout redirect; see
                // AdminLogoutRevocationFilter's Javadoc. Anchored on LogoutFilter because the
                // authorization server's own endpoint filters have no registered order and
                // cannot be used as a reference point; the filter restricts itself to
                // /connect/logout, so sitting early in the chain costs nothing.
                .addFilterBefore(new AdminLogoutRevocationFilter(
                                authorizationService, registeredClientRepository, adminTokenSessions),
                        LogoutFilter.class)
                // OIDC discovery and the JWKS endpoint are meant to be publicly readable per
                // spec (and per this project's own FRONTEND_AUTH_INTEGRATION.md, which
                // documents GET /.well-known/openid-configuration as the first call any real
                // app makes) - unlike /oauth2/token etc., there is no client-authentication
                // step for either of these that could otherwise satisfy anyRequest().authenticated()
                // below, so without this they 403 for anyone without an existing session
                // cookie. That accidentally "worked" for a browser that was already logged in
                // (4203/4204 testing), but failed for a fresh/incognito visit - exactly what
                // surfaced testing the APK dev client.
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers(HttpMethod.GET, "/.well-known/**", "/oauth2/jwks").permitAll()
                        .anyRequest().authenticated())
                // Browser-navigated authorization requests without a session fall through
                // to the login page; API-style requests (token/jwks/userinfo) get a 401.
                .exceptionHandling((exceptions) -> exceptions
                        .defaultAuthenticationEntryPointFor(
                                new LoginUrlAuthenticationEntryPoint("/login"),
                                new MediaTypeRequestMatcher(MediaType.TEXT_HTML)
                        )
                )
                // ----- RATE LIMITING CODE: wired into /oauth2/token's chain too -----
                .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        // This redirect override is configured only by application-prod.yml. Leave test/dev
        // OAuth clients' registered post-logout redirects unchanged.
        if (!appLogoutLandingUrl.isBlank()) {
            http.addFilterBefore(new AppLogoutLandingFilter(
                            appClientId, additionalAppClientId, appLogoutLandingUrl),
                    LogoutFilter.class);
        }

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
                        .filter(authority -> !authority.startsWith("AUTH_PROVIDER_ID_"))
                        .map(authority -> authority.substring("AUTH_PROVIDER_".length()).toLowerCase())
                        .findFirst()
                        .ifPresent(provider -> context.getClaims().claim("authProvider", provider));
                authorities.stream()
                        .filter(authority -> authority.startsWith("AUTH_PROVIDER_ID_"))
                        .map(authority -> authority.substring("AUTH_PROVIDER_ID_".length()))
                        .findFirst()
                        .ifPresent(encodedProviderId -> {
                            try {
                                String providerId = new String(java.util.Base64.getUrlDecoder().decode(encodedProviderId),
                                        java.nio.charset.StandardCharsets.UTF_8);
                                context.getClaims().claim("socialProviderId", providerId);
                            } catch (IllegalArgumentException ignored) {
                                // Malformed transient auth metadata must not break token issuance.
                            }
                        });
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
