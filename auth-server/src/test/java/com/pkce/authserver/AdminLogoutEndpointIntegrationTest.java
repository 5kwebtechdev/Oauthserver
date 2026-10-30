package com.pkce.authserver;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Hits the real, running /adminlogout endpoint over actual HTTP, unlike
 * AdminLogoutControllerTest (which calls the controller's Java method directly and so never
 * exercises Spring's @RequestParam binding at all). That gap is exactly how a real bug shipped
 * once already: a missing @RequestParam(name=...) made every real request throw, but the
 * existing generic /error handler's redirect-to-login fallback silently masked it, so the
 * endpoint LOOKED like it worked (a 302) while its actual logic never ran. These tests catch
 * that class of bug by checking for the specific, non-generic redirect target that only the
 * endpoint's own logic (not the fallback) can produce.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AdminLogoutEndpointIntegrationTest {

    private static final String TEST_ADMIN_CLIENT_ID = "test-admin-client-" + System.nanoTime();
    private static final String ADMIN_POST_LOGOUT_URI = "https://admin.supermeapp.test/";

    @DynamicPropertySource
    static void registerAdminClientId(DynamicPropertyRegistry registry) {
        registry.add("app.frontend.admin-client-id", () -> TEST_ADMIN_CLIENT_ID);
    }

    @LocalServerPort
    private int port;

    @Autowired
    private RegisteredClientRepository registeredClientRepository;

    private String baseUrl;
    private HttpClient http;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
        http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        // setUp() runs before every @Test, but TEST_ADMIN_CLIENT_ID (and the Spring context
        // holding registeredClientRepository) is shared across them in this class - register
        // once, idempotently, same pattern as ClientRegistrationSeeder.
        if (registeredClientRepository.findByClientId(TEST_ADMIN_CLIENT_ID) == null) {
            registeredClientRepository.save(RegisteredClient.withId(UUID.randomUUID().toString())
                    .clientId(TEST_ADMIN_CLIENT_ID)
                    .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .redirectUri("https://admin.supermeapp.test/callback")
                    .postLogoutRedirectUri(ADMIN_POST_LOGOUT_URI)
                    .scope("openid")
                    .clientSettings(ClientSettings.builder().requireAuthorizationConsent(false).requireProofKey(true).build())
                    .build());
        }
    }

    @Test
    void realRequestWithNoIdTokenHintRedirectsToTheRegisteredAdminUri_notJustTheGenericFallback() throws Exception {
        HttpResponse<Void> response = send(baseUrl + "/adminlogout?post_logout_redirect_uri="
                + java.net.URLEncoder.encode(ADMIN_POST_LOGOUT_URI, java.nio.charset.StandardCharsets.UTF_8));

        assertThat(response.statusCode()).isEqualTo(302);
        // The generic error fallback always redirects to /login - only the endpoint's own
        // logic (actual request binding + registered-client lookup) produces this exact URI.
        assertThat(response.headers().firstValue("Location")).contains(ADMIN_POST_LOGOUT_URI);
    }

    @Test
    void realRequestWithAGarbageIdTokenHintStillRedirectsCleanly_neverA500() throws Exception {
        HttpResponse<Void> response = send(baseUrl + "/adminlogout?id_token_hint=not-a-real-token"
                + "&post_logout_redirect_uri=" + java.net.URLEncoder.encode(ADMIN_POST_LOGOUT_URI, java.nio.charset.StandardCharsets.UTF_8));

        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location")).contains(ADMIN_POST_LOGOUT_URI);
    }

    @Test
    void anUnregisteredRedirectTargetFallsBackToLogin_notAnOpenRedirect() throws Exception {
        HttpResponse<Void> response = send(baseUrl + "/adminlogout?post_logout_redirect_uri="
                + java.net.URLEncoder.encode("https://evil.example.com/", java.nio.charset.StandardCharsets.UTF_8));

        assertThat(response.statusCode()).isEqualTo(302);
        String location = response.headers().firstValue("Location").orElseThrow();
        assertThat(location).contains("/login").doesNotContain("evil.example.com");
    }

    private HttpResponse<Void> send(String url) throws java.io.IOException, InterruptedException {
        return http.send(HttpRequest.newBuilder(URI.create(url)).GET().build(),
                HttpResponse.BodyHandlers.discarding());
    }
}
