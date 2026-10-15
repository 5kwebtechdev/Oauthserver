package com.pkce.authserver;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The BE-served /login page is the only login UI (the Angular app has no login page of its own),
 * so these are guards on the two things that make it work: the single identifier field has to ask
 * for an email or phone rather than a username, because that is what SuperMeBE accounts are found
 * by, and the Google script has to follow redirectTo back into the flow.
 *
 * The old profileCompleted branch is gone with the complete-profile endpoint: accounts now come
 * from SuperMeBE's own onboarding, so there is no half-finished profile for this page to fix up.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
        "app.security.cors.allowed-origins=http://localhost:4200,http://localhost:4204",
        "app.security.additional-client.id=supermeapp-web-4204",
        "app.security.additional-client.redirect-uris=http://localhost:4204/callback",
        "app.security.additional-client.post-logout-redirect-uri=http://localhost:4204/",
        "app.frontend.additional-client-id=supermeapp-web-4204",
        "app.frontend.additional-base-url=http://localhost:4204/",
        "app.frontend.additional-signup-url=http://localhost:4204/signup",
        "app.frontend.additional-forgot-password-url=http://localhost:4204/forgot-password"
})
@ActiveProfiles("test")
class LoginPageControllerTest {

    @LocalServerPort
    private int port;

    private String loginPageHtml() throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/login")).GET().build();
        HttpResponse<String> resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        assertThat(resp.statusCode()).isEqualTo(200);
        return resp.body();
    }

    @Test
    void loginPage_asksForEmailOrPhone_notUsername() throws Exception {
        String html = loginPageHtml();
        assertThat(html).contains("placeholder=\"Email or phone\"");
        // The form field is still named "username" - that's Spring Security's parameter name, not
        // a claim about what the value is.
        assertThat(html).contains("name=\"username\"");
        assertThat(html).doesNotContain("placeholder=\"Username\"");
    }

    @Test
    void loginPage_googleScript_followsRedirectTo() throws Exception {
        String html = loginPageHtml();
        assertThat(html).contains("redirectTo");
        assertThat(html).doesNotContain("data.profileCompleted");
        assertThat(html).doesNotContain("complete-profile");
    }

    /** A verified Google identity with no account is sent to the configured FE signup wizard. */
    @Test
    void loginPage_routesUnknownGoogleAccountToFrontendSignup() throws Exception {
        String html = loginPageHtml();

        assertThat(html).contains("registrationRequired");
        assertThat(html).contains("function redirectToFrontendSignup(handoffTicket)");
        assertThat(html).contains("signupUrl.searchParams.set('step', '1')");
        assertThat(html).contains("signupUrl.searchParams.set('googleSignupTicket', handoffTicket)");
        assertThat(html).contains("redirectToFrontendSignup(result.data.handoffTicket)");
        assertThat(html).doesNotContain("register-pane", "/api/auth/register", "openRegistrationForm");
    }

    /**
     * Every placeholder in the page template is substituted. A mismatch between the %s count and
     * the formatted() arguments would either throw at render time or silently leave a literal
     * placeholder in the HTML - this page is a single large text block, so it is worth asserting.
     */
    @Test
    void loginPage_hasNoUnsubstitutedPlaceholders() throws Exception {
        String html = loginPageHtml();
        assertThat(html).doesNotContain("%s");
        assertThat(html).contains("http://localhost:4200/");
    }

    @Test
    void loginPage_rendersCssPercentagesWithoutFormattingErrors() throws Exception {
        String html = loginPageHtml();
        assertThat(html).contains("ellipse at 12% 18%", "width: 100%;", "border-radius: 50%;");
        assertThat(html).doesNotContain("%%");
    }
    @Test
    void additionalClientUsesItsOwnLoginLinks() throws Exception {
        var cookies = new java.net.CookieManager();
        cookies.setCookiePolicy(java.net.CookiePolicy.ACCEPT_ALL);
        HttpClient http = HttpClient.newBuilder().cookieHandler(cookies).build();
        String query = "/oauth2/authorize?response_type=code&client_id=supermeapp-web-4204"
                + "&redirect_uri=http%3A%2F%2Flocalhost%3A4204%2Fcallback&scope=openid%20profile"
                + "&state=test-state&code_challenge=abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ&code_challenge_method=S256";
        var authorization = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + query)).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(authorization.statusCode()).isEqualTo(302);
        var login = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/login")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.body()).contains("href=\"http://localhost:4204/signup\"", "href=\"http://localhost:4204/forgot-password\"");
    }

    @Test
    void tokenCorsAllowsBothFrontendsAndRejectsUnknownOrigin() throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        for (String origin : java.util.List.of("http://localhost:4200", "http://localhost:4204")) {
            var response = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/oauth2/token"))
                    .header("Origin", origin).header("Access-Control-Request-Method", "POST")
                    .header("Access-Control-Request-Headers", "content-type").method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(),
                    HttpResponse.BodyHandlers.ofString());
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(response.headers().firstValue("Access-Control-Allow-Origin")).contains(origin);
        }
        var denied = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/oauth2/token"))
                .header("Origin", "http://unregistered.example").header("Access-Control-Request-Method", "POST")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(denied.statusCode()).isEqualTo(403);
    }

}
