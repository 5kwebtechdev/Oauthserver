package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * EmailService is mocked here (and never actually calls Gmail) so these tests can capture the real,
 * randomly-generated OTP that ContinueWithEmailController's /request sends, the same way a real
 * caller would read it from their inbox - see OtpService/EmailService for why the old hardcoded
 * "123123" no longer exists anywhere.
 *
 * Continue-with-email is login-only now: it used to register whoever typed in a new address, which
 * SuperMeBE's User table cannot accommodate (name, gender, dateOfBirth and relationship are all
 * NOT NULL and only its own onboarding collects them). An unknown address gets told to register in
 * the app, and no code is even sent.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ContinueWithEmailAndProfileTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

    @MockBean
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final org.mockito.ArgumentCaptor<String> otpCaptor = org.mockito.ArgumentCaptor.forClass(String.class);

    /** Triggers /request and returns the OTP EmailService was asked to send for that email. */
    private String requestOtp(HttpClient http, String base, String email) throws Exception {
        org.mockito.Mockito.reset(emailService);
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());
        HttpResponse<String> resp = postJson(http, base, "/api/auth/continue-with-email/request",
                "{\"email\":\"" + email + "\"}");
        assertThat(resp.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp.body()).get("exists").asBoolean()).isTrue();
        verify(emailService).sendOtpEmail(eq(email), otpCaptor.capture());
        return otpCaptor.getValue();
    }

    private HttpResponse<String> postJson(HttpClient http, String base, String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create(base + path))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void continueWithEmail_existingAccount_logsIn_andTheCodeIsSingleUse() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String base = "http://localhost:" + port;
        String email = "cwe-" + System.nanoTime() + "@example.com";
        SupermeUserFixture.saveWithoutPassword(userRepository, email);

        String otp = requestOtp(http, base, email);
        assertThat(otp).matches("\\d{6}");

        HttpResponse<String> wrongOtp = postJson(http, base, "/api/auth/continue-with-email/verify",
                "{\"email\":\"" + email + "\",\"otp\":\"000000\"}");
        assertThat(wrongOtp.statusCode()).isEqualTo(400);

        HttpResponse<String> verifyResp = postJson(http, base, "/api/auth/continue-with-email/verify",
                "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        assertThat(verifyResp.statusCode()).isEqualTo(200);
        JsonNode verifyBody = objectMapper.readTree(verifyResp.body());
        assertThat(verifyBody.get("newUser").asBoolean()).isFalse();
        assertThat(verifyBody.get("username").asText()).isEqualTo(email);

        // The OTP is single-use - replaying it must now fail even with the right code.
        HttpResponse<String> replay = postJson(http, base, "/api/auth/continue-with-email/verify",
                "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        assertThat(replay.statusCode()).isEqualTo(400);
    }

    @Test
    void continueWithEmail_unknownAddress_sendsNoCode_andCreatesNobody() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String base = "http://localhost:" + port;
        String email = "nobody-" + System.nanoTime() + "@example.com";

        HttpResponse<String> resp = postJson(http, base, "/api/auth/continue-with-email/request",
                "{\"email\":\"" + email + "\"}");
        assertThat(resp.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp.body()).get("exists").asBoolean()).isFalse();
        verifyNoInteractions(emailService);
        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void continueWithEmail_deletedAccount_cannotLogIn() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String base = "http://localhost:" + port;
        String email = "cwe-deleted-" + System.nanoTime() + "@example.com";
        var user = SupermeUserFixture.user(email);
        user.setDeleted(true);
        userRepository.save(user);

        String otp = requestOtp(http, base, email);
        HttpResponse<String> verifyResp = postJson(http, base, "/api/auth/continue-with-email/verify",
                "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        assertThat(verifyResp.statusCode()).isEqualTo(400);
    }
}
