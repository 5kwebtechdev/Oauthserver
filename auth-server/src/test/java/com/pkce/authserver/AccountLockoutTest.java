package com.pkce.authserver;

import com.pkce.authserver.entity.LoginAttempt;
import com.pkce.authserver.repository.LoginAttemptRepository;
import com.pkce.authserver.repository.SecurityEventRepository;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * app.account-lockout.max-attempts=3 in application-test.yml (vs. the real default of 5)
 * so these tests don't need an unreasonable number of requests to trigger a lockout.
 *
 * The counters live in our own auth_login_attempt table rather than on the user row, because
 * SuperMeBE's User table has no columns for them - see LoginAttempt.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AccountLockoutTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    @Autowired
    private LoginAttemptRepository loginAttemptRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SecurityEventRepository securityEventRepository;

    private static final Pattern CSRF_PATTERN = Pattern.compile("name=\"_csrf\"[^>]*value=\"([^\"]+)\"");

    private User seedUser(String correctPassword) {
        String email = "lockout-" + System.nanoTime() + "@example.com";
        return SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, correctPassword);
    }

    private LoginAttempt attemptStateOf(User user) {
        return loginAttemptRepository.findById(user.getId()).orElseThrow();
    }

    private void attemptLogin(HttpClient http, String identifier, String password) throws Exception {
        String base = "http://localhost:" + port;
        HttpResponse<String> loginPage = http.send(
                HttpRequest.newBuilder(URI.create(base + "/login")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        Matcher m = CSRF_PATTERN.matcher(loginPage.body());
        assertThat(m.find()).isTrue();
        String csrf = m.group(1);

        String form = "username=" + urlEncode(identifier) + "&password=" + password + "&_csrf=" + csrf;
        http.send(
                HttpRequest.newBuilder(URI.create(base + "/login"))
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private boolean redirectedToSuccess(HttpClient http, String identifier, String password) throws Exception {
        String base = "http://localhost:" + port;
        HttpResponse<String> loginPage = http.send(
                HttpRequest.newBuilder(URI.create(base + "/login")).GET().build(),
                HttpResponse.BodyHandlers.ofString());
        Matcher m = CSRF_PATTERN.matcher(loginPage.body());
        assertThat(m.find()).isTrue();
        String csrf = m.group(1);

        String form = "username=" + urlEncode(identifier) + "&password=" + password + "&_csrf=" + csrf;
        HttpClient noRedirect = HttpClient.newBuilder()
                .cookieHandler(http.cookieHandler().orElseThrow())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        HttpResponse<String> resp = noRedirect.send(
                HttpRequest.newBuilder(URI.create(base + "/login"))
                        .POST(HttpRequest.BodyPublishers.ofString(form))
                        .header("Content-Type", "application/x-www-form-urlencoded")
                        .build(),
                HttpResponse.BodyHandlers.ofString());
        String location = resp.headers().firstValue("Location").orElse("");
        return resp.statusCode() == 302 && !location.contains("error");
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
    }

    @Test
    void repeatedWrongPassword_locksAccount_andCorrectPasswordIsThenRejected() throws Exception {
        String password = "RealPassword123!";
        User user = seedUser(password);
        String email = user.getEmail();
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();

        for (int i = 0; i < 3; i++) {
            attemptLogin(http, email, "WrongPassword!");
        }

        LoginAttempt locked = attemptStateOf(user);
        assertThat(locked.isAccountNonLocked()).isFalse();
        assertThat(locked.getLockedUntil()).isNotNull();
        assertThat(locked.getFailedAttempts()).isEqualTo(3);

        // Correct password no longer works once locked.
        assertThat(redirectedToSuccess(http, email, password)).isFalse();

        boolean sawLockEvent = securityEventRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .anyMatch(e -> "ACCOUNT_LOCKED".equals(e.getEventType()) && email.equals(e.getIdentifier()));
        assertThat(sawLockEvent).isTrue();
    }

    @Test
    void successfulLogin_resetsFailedAttemptCounter() throws Exception {
        String password = "RealPassword123!";
        User user = seedUser(password);
        String email = user.getEmail();
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();

        attemptLogin(http, email, "WrongPassword!");
        attemptLogin(http, email, "WrongPassword!");
        assertThat(attemptStateOf(user).getFailedAttempts()).isEqualTo(2);

        assertThat(redirectedToSuccess(http, email, password)).isTrue();

        LoginAttempt afterSuccess = attemptStateOf(user);
        assertThat(afterSuccess.getFailedAttempts()).isEqualTo(0);
        assertThat(afterSuccess.isAccountNonLocked()).isTrue();
    }

    @Test
    void expiredLock_isAutoClearedOnNextLookup() throws Exception {
        String password = "RealPassword123!";
        User user = seedUser(password);

        LoginAttempt locked = new LoginAttempt(user.getId());
        locked.setAccountNonLocked(false);
        locked.setFailedAttempts(3);
        locked.setLockedUntil(LocalDateTime.now().minusMinutes(1)); // already expired
        loginAttemptRepository.save(locked);

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        assertThat(redirectedToSuccess(http, user.getEmail(), password)).isTrue();

        LoginAttempt unlocked = attemptStateOf(user);
        assertThat(unlocked.isAccountNonLocked()).isTrue();
        assertThat(unlocked.getLockedUntil()).isNull();
    }

    @Test
    void phoneNumber_worksAsLoginIdentifier() throws Exception {
        String password = "RealPassword123!";
        String email = "phone-login-" + System.nanoTime() + "@example.com";
        String phone = "+91 98765" + (10000 + (int) (System.nanoTime() % 80000));
        SupermeUserFixture.saveWithPassword(userRepository, userPasswordRepository, passwordEncoder,
                email, phone, password, com.pkce.authserver.superme.enums.Role.USER);

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        assertThat(redirectedToSuccess(http, phone, password)).isTrue();
    }

    @Test
    void userWithoutPasswordRow_cannotLogIn() throws Exception {
        String email = "nopassword-" + System.nanoTime() + "@example.com";
        SupermeUserFixture.saveWithoutPassword(userRepository, email);

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        assertThat(redirectedToSuccess(http, email, "AnyPassword123!")).isFalse();
    }
}
