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
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
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

    /**
     * Google sign-in for an address with no SuperMeApp account must open the registration form on
     * this page rather than dead-ending on an error - the identity is already verified, only the
     * fields SuperMeBE's User table requires are missing.
     */
    @Test
    void loginPage_carriesTheGoogleRegistrationForm() throws Exception {
        String html = loginPageHtml();

        assertThat(html).contains("id=\"register-pane\"");
        assertThat(html).contains("registrationRequired");
        assertThat(html).contains("/api/auth/register");
        // The fields that cannot be defaulted, because the live table rejects a row without them.
        assertThat(html).contains("id=\"reg-name\"");
        assertThat(html).contains("id=\"reg-gender\"");
        assertThat(html).contains("id=\"reg-dob\"");
        assertThat(html).contains("id=\"reg-relationship\"");
        // The same Google token that proved the identity is reused as proof for registration.
        assertThat(html).contains("googleIdToken");
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
}
