package com.pkce.authserver.config;

import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.security.RateLimitFilter;
import com.pkce.authserver.security.TurnstileLoginFilter;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.TurnstileVerificationService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.util.matcher.AntPathRequestMatcher;
import org.springframework.http.HttpStatus;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableConfigurationProperties({RateLimitProperties.class, AccountLockoutProperties.class, TurnstileProperties.class,
        SupermeProperties.class})
public class DefaultSecurityConfig {

    @Value("${app.security.cors.allowed-origins}")
    private String allowedOrigin;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    @Value("${app.frontend.admin-client-id:}")
    private String adminClientId;
    @Value("${app.frontend.admin-dev-client-id:}")
    private String adminDevClientId;
    @Value("${app.frontend.apk-dev-client-id:}")
    private String apkDevClientId;

    /**
     * Catch-all chain: the login form shown mid-authorization-code-flow, the (demo-only)
     * password-reset API called directly by the Angular app, and anything else outside
     * the OAuth2/OIDC endpoint set handled by AuthorizationServerConfig and the
     * Bearer-token-protected /api/admin/** set handled by AdminApiSecurityConfig.
     */
    @Bean
    @Order(3)
    public SecurityFilterChain defaultSecurityFilterChain(HttpSecurity http, RateLimitFilter rateLimitFilter,
                                                            TurnstileLoginFilter turnstileLoginFilter,
                                                            AdminLoginContextFilter adminLoginContextFilter)
            throws Exception {
        http
                .authorizeHttpRequests((authorize) -> authorize
                        .requestMatchers("/error").permitAll()
                        // Chrome DevTools auto-probes this on any site with DevTools
                        // open; harmless, but left unauthenticated it would otherwise
                        // get cached as the "saved request" and could hijack the
                        // post-login redirect target instead of the real one.
                        .requestMatchers("/.well-known/appspecific/**").permitAll()
                        .requestMatchers("/api/auth/forgot-password/**").permitAll()
                        .requestMatchers("/api/auth/google-login").permitAll()
                        .requestMatchers("/api/auth/handoff-login").permitAll()
                        .requestMatchers("/api/auth/google-signup-handoff").permitAll()
                        .requestMatchers("/api/auth/continue-with-email/**").permitAll()
                        // Registration is open by necessity - the caller has no account yet. It
                        // still has to prove ownership of the email inside the request body (an
                        // emailed OTP or a Google ID token), see RegisterController.
                                                .requestMatchers("/api/auth/register", "/api/auth/register/**").permitAll()
                        // SuperMeBE-compatible API (ARCHITECTURE.md section 20): the SuperMeApp
                        // frontend calls these unauthenticated, exactly as it does against their
                        // server. Each one does its own verification - an OTP for register, a
                        // password for login.
                        .requestMatchers("/v1/**").permitAll()
                        .anyRequest().authenticated()
                )
                .cors((cors) -> cors.configurationSource(corsConfigurationSource()))
                // These APIs are called by the Angular SPA via fetch/XHR, which never
                // sees this server's CSRF cookie - same reasoning as the OAuth2 token
                // endpoint in AuthorizationServerConfig.
                .csrf((csrf) -> csrf.ignoringRequestMatchers(
                        "/api/auth/forgot-password/**", "/api/auth/google-login", "/api/auth/handoff-login",
                        "/api/auth/google-signup-handoff",
                        "/api/auth/continue-with-email/**", "/api/auth/register", "/api/auth/register/**",
                        "/v1/**"))
                .formLogin((form) -> form.loginPage("/login")
                        // Preserve saved OAuth requests; direct logins return to the frontend.
                        .defaultSuccessUrl(frontendBaseUrl, false)
                        .permitAll())
                // ----- RATE LIMITING CODE: wired in before Turnstile -----
                // Cheapest check first: in-memory rate limit before the Turnstile filter's
                // outbound call to Cloudflare, so a flood gets rejected without paying for
                // a network round trip on every single request.
                .addFilterBefore(turnstileLoginFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(rateLimitFilter, TurnstileLoginFilter.class)
                // Must run before UsernamePasswordAuthenticationFilter (which triggers
                // AppUserDetailsService.loadUserByUsername) so the admin-vs-not context is
                // set before authentication happens - see AdminLoginContextFilter's Javadoc.
                .addFilterBefore(adminLoginContextFilter, RateLimitFilter.class);

        return http.build();
    }

    private CorsConfigurationSource corsConfigurationSource() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

        CorsConfiguration statelessConfig = new CorsConfiguration();
        statelessConfig.setAllowedOrigins(java.util.Arrays.stream(allowedOrigin.split(",")).map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        statelessConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        statelessConfig.setAllowedHeaders(List.of("*"));
        statelessConfig.setAllowCredentials(false);
        // OPTIONS may be handled by the default chain rather than the OAuth
        // endpoint matcher, so token preflights need the same origin allowlist.
        source.registerCorsConfiguration("/oauth2/**", statelessConfig);
        source.registerCorsConfiguration("/.well-known/**", statelessConfig);
        source.registerCorsConfiguration("/api/auth/forgot-password/**", statelessConfig);

        // This endpoint sets the session cookie that carries the user's login state into
        // the subsequent /oauth2/authorize redirect, so the browser must be allowed to
        // both send and store it on this cross-origin XHR - allowCredentials(true), which
        // requires a literal origin here rather than "*".
        CorsConfiguration credentialedConfig = new CorsConfiguration();
        credentialedConfig.setAllowedOrigins(java.util.Arrays.stream(allowedOrigin.split(",")).map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        credentialedConfig.setAllowedMethods(List.of("POST", "OPTIONS"));
        credentialedConfig.setAllowedHeaders(List.of("*"));
        credentialedConfig.setAllowCredentials(true);
        source.registerCorsConfiguration("/api/auth/google-login", credentialedConfig);
        // Sets the session cookie the handoff relies on, so the browser must be allowed to store it.
        source.registerCorsConfiguration("/api/auth/handoff-login", credentialedConfig);
        source.registerCorsConfiguration("/api/auth/google-signup-handoff", statelessConfig);
        source.registerCorsConfiguration("/api/auth/continue-with-email/**", credentialedConfig);
        source.registerCorsConfiguration("/api/auth/register", credentialedConfig);
        source.registerCorsConfiguration("/api/auth/register/**", credentialedConfig);

        // The compat API is consumed by the SuperMeApp frontend as a plain JSON API - it carries a
        // Bearer token rather than this server's session cookie, so it needs GET as well as POST
        // and no credentialed-origin restriction beyond the configured one.
        CorsConfiguration compatConfig = new CorsConfiguration();
        compatConfig.setAllowedOrigins(java.util.Arrays.stream(allowedOrigin.split(",")).map(String::trim).filter(origin -> !origin.isEmpty()).toList());
        compatConfig.setAllowedMethods(List.of("GET", "POST", "OPTIONS"));
        compatConfig.setAllowedHeaders(List.of("*"));
        compatConfig.setAllowCredentials(true);
        source.registerCorsConfiguration("/v1/**", compatConfig);

        return source;
    }

    // ----- RATE LIMITING CODE: bean definition -----
    @Bean
    public RateLimitFilter rateLimitFilter(RateLimitProperties properties, SecurityEventService securityEventService) {
        return new RateLimitFilter(properties, securityEventService);
    }

    @Bean
    public TurnstileLoginFilter turnstileLoginFilter(TurnstileVerificationService turnstileVerificationService,
                                                       SecurityEventService securityEventService) {
        return new TurnstileLoginFilter(turnstileVerificationService, securityEventService);
    }

    @Bean
    public AdminLoginContextFilter adminLoginContextFilter() {
        return new AdminLoginContextFilter(adminClientId, adminDevClientId, apkDevClientId);
    }

    /**
     * Prevent Spring Boot from auto-registering RateLimitFilter as a plain servlet
     * filter (it would then run a second time, outside Spring Security's chain, on
     * every request). It is wired into the security chains explicitly instead.
     */
    @Bean
    public FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter rateLimitFilter) {
        FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(rateLimitFilter);
        registration.setEnabled(false);
        return registration;
    }

    /** Same reasoning as rateLimitFilterRegistration above - wired into the chain explicitly. */
    @Bean
    public FilterRegistrationBean<AdminLoginContextFilter> adminLoginContextFilterRegistration(
            AdminLoginContextFilter adminLoginContextFilter) {
        FilterRegistrationBean<AdminLoginContextFilter> registration = new FilterRegistrationBean<>(adminLoginContextFilter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
