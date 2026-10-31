package com.pkce.authserver;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * A context-less /login hit (no pending OAuth request at all - a direct visit, not partway
 * through a flow) used to render this server's own plain, unbranded form. This dev server only
 * really serves the apk app, so that plain form has no use left: /login now redirects such a
 * visitor straight to /apklogin instead.
 *
 * The risky part of this change is the redirect pair it creates: /apklogin bounces back to
 * /login whenever it doesn't recognize the apk client (meant for e.g. an admin bookmark landing
 * here by mistake) - and /login's new fallback above sends context-less visitors to /apklogin.
 * Without narrowing /apklogin's bounce-back to only fire when there IS some other recognized
 * context (admin or the 4204 app), those two would redirect into each other forever for exactly
 * the context-less case this change targets. These tests pin down both ends of that pair.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.security.cors.allowed-origins=http://localhost:4200,http://localhost:4203",
        "app.security.apk-dev-client.id=supermeapp-dev-web",
        "app.security.apk-dev-client.redirect-uris=http://localhost:4203/callback",
        "app.security.apk-dev-client.post-logout-redirect-uri=http://localhost:4203/",
        "app.frontend.apk-dev-client-id=supermeapp-dev-web",
        "app.frontend.apk-dev-base-url=http://localhost:4203/",
        "app.frontend.apk-dev-signup-url=http://localhost:4203/signup",
        "app.frontend.apk-dev-forgot-password-url=http://localhost:4203/forgot-password"
})
@ActiveProfiles("test")
class ApkLoginFallbackTest {

    @LocalServerPort
    private int port;

    private HttpClient clientWithCookies() {
        var cookies = new CookieManager();
        cookies.setCookiePolicy(CookiePolicy.ACCEPT_ALL);
        return HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Test
    void contextLessLoginHitRedirectsStraightToApklogin() throws Exception {
        var response = clientWithCookies().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/login")).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(302);
        assertThat(response.headers().firstValue("Location")).hasValueSatisfying(
                location -> assertThat(location).contains("/apklogin"));
    }

    @Test
    void directApkloginVisitRendersWithoutBouncingBackToLogin() throws Exception {
        var response = clientWithCookies().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/apklogin")).GET().build(),
                HttpResponse.BodyHandlers.ofString());

        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.body()).contains("Welcome to SuperMeApp");
    }

    @Test
    void realApkAuthorizationRequestStillReachesApkloginThroughLogin() throws Exception {
        HttpClient http = clientWithCookies();
        String query = "/oauth2/authorize?response_type=code&client_id=supermeapp-dev-web"
                + "&redirect_uri=http%3A%2F%2Flocalhost%3A4203%2Fcallback&scope=openid%20profile"
                + "&state=test-state&code_challenge=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ&code_challenge_method=S256";
        var authorize = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + query)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(authorize.statusCode()).isEqualTo(302);

        String redirectLocation = authorize.headers().firstValue("Location").orElseThrow();
        URI redirectUri = redirectLocation.startsWith("http")
                ? URI.create(redirectLocation)
                : URI.create("http://localhost:" + port + redirectLocation);
        var login = http.send(HttpRequest.newBuilder(redirectUri).GET().build(), HttpResponse.BodyHandlers.ofString());

        // Either this server's entry point already sent /oauth2/authorize straight to /apklogin
        // (200), or it went through /login first and got redirected on (302 to /apklogin) -
        // both are correct; the one thing that must never happen is landing on the plain form.
        if (login.statusCode() == 200) {
            assertThat(login.body()).contains("Welcome to SuperMeApp");
        } else {
            assertThat(login.statusCode()).isEqualTo(302);
            assertThat(login.headers().firstValue("Location")).hasValueSatisfying(
                    location -> assertThat(location).contains("/apklogin"));
        }
    }
}
