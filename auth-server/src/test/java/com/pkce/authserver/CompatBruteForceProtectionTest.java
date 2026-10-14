package com.pkce.authserver;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

/**
 * The SuperMeBE-compatible codes are 4 digits - 9000 possibilities - and live for 2 minutes, so a
 * guessing cap is not optional the way it might be for a 6-digit code. SuperMeBE's own
 * implementation has no cap (nothing else could reach it there); these endpoints are reachable
 * directly, so without one a reset code is brute-forceable into a full account takeover.
 *
 * Rate limiting alone does not close this: it is per IP, and an attacker with a handful of
 * addresses still gets through 9000 guesses inside the window. The cap on the code itself is what
 * actually bounds it.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class CompatBruteForceProtectionTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> post(String path, String json) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build(), HttpResponse.BodyHandlers.ofString());
    }

    private String captureOtp(String expectedSubject) {
        org.mockito.ArgumentCaptor<String> html = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlMail(anyString(), eq(expectedSubject), html.capture());
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("monospace;\">(\\d{4})</div>").matcher(html.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1);
    }

    /** A wrong code that is guaranteed not to be the real one. */
    private String wrongCodeOtherThan(String realOtp) {
        return realOtp.equals("1111") ? "2222" : "1111";
    }

    @Test
    void registrationOtp_stopsAcceptingGuessesAfterTheCap() throws Exception {
        doNothing().when(emailService).sendHtmlMail(anyString(), anyString(), anyString());
        String email = "bf-register-" + System.nanoTime() + "@yopmail.com";

        post("/v1/api/auth/send-otp", "{\"email\":\"" + email + "\"}");
        String realOtp = captureOtp("Your OTP Verification Code - SuperMe");
        String wrong = wrongCodeOtherThan(realOtp);

        for (int i = 0; i < 5; i++) {
            HttpResponse<String> attempt = post("/v1/api/auth/verify-otp",
                    "{\"email\":\"" + email + "\",\"otp\":\"" + wrong + "\"}");
            assertThat(attempt.statusCode()).isEqualTo(400);
        }

        // The code must now be dead - otherwise 9000 guesses is just a matter of time.
        HttpResponse<String> withRealCode = post("/v1/api/auth/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"" + realOtp + "\"}");
        assertThat(withRealCode.statusCode())
                .as("the correct code must stop working once the guess cap is hit")
                .isEqualTo(400);
        assertThat(objectMapper.readTree(withRealCode.body()).get("message").asText())
                .contains("Please request a new OTP");
    }

    @Test
    void passwordResetOtp_stopsAcceptingGuessesAfterTheCap() throws Exception {
        doNothing().when(emailService).sendHtmlMail(anyString(), anyString(), anyString());
        String email = "bf-reset-" + System.nanoTime() + "@yopmail.com";
        SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, "OldPassword1");

        post("/v1/auth/forgot-password", "{\"email\":\"" + email + "\"}");
        String realOtp = captureOtp("Reset Your Password - SuperMe");
        String wrong = wrongCodeOtherThan(realOtp);

        for (int i = 0; i < 5; i++) {
            post("/v1/auth/forgot-password/verify-otp",
                    "{\"email\":\"" + email + "\",\"otp\":\"" + wrong + "\"}");
        }

        HttpResponse<String> withRealCode = post("/v1/auth/forgot-password/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"" + realOtp + "\"}");
        assertThat(withRealCode.statusCode())
                .as("a guessable reset code is an account takeover - the cap must kill it")
                .isEqualTo(400);

        // And the reset window must not have opened.
        HttpResponse<String> reset = post("/v1/auth/forgot-password/reset-password",
                "{\"email\":\"" + email + "\",\"password\":\"NewPassword1\"}");
        assertThat(reset.statusCode()).isEqualTo(400);
        assertThat(passwordEncoder.matches("OldPassword1",
                userPasswordRepository.findByUser(userRepository.findByEmail(email).orElseThrow())
                        .orElseThrow().getPassword())).isTrue();
    }

    /**
     * /v1/auth/login compares the password hash itself instead of going through the
     * AuthenticationManager, so Spring Security's failure events - and with them the lockout
     * listener - never fire for it. It has to drive the lockout explicitly, or the account-level
     * defence exists on the form login and nowhere else.
     *
     * app.account-lockout.max-attempts is 3 in application-test.yml.
     */
    @Test
    void compatLogin_locksTheAccountAfterRepeatedWrongPasswords() throws Exception {
        String email = "bf-login-" + System.nanoTime() + "@yopmail.com";
        SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, "RealPassword1");

        for (int i = 0; i < 3; i++) {
            HttpResponse<String> wrong = post("/v1/auth/login",
                    "{\"email\":\"" + email + "\",\"password\":\"WrongPassword" + i + "\"}");
            assertThat(wrong.statusCode()).isEqualTo(401);
        }

        // The correct password must now be refused too - that is what makes it a lockout rather
        // than just a per-request rejection.
        HttpResponse<String> correct = post("/v1/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"RealPassword1\"}");
        assertThat(correct.statusCode())
                .as("the account should be locked, so even the right password is refused")
                .isEqualTo(401);
        assertThat(objectMapper.readTree(correct.body()).get("message").asText())
                .contains("temporarily locked");
    }
}
