package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.service.EmailService;
import com.pkce.authserver.superme.model.User;
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
import static org.mockito.Mockito.verifyNoInteractions;

/**
 * SuperMeBE's three-step password reset at /v1/auth/forgot-password, and the branded HTML emails
 * both compat flows send. Pins the behaviour their frontend branches on: 404 for an unknown
 * address, a 4-digit code, and a reset that only works inside the window verification opens.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SupermeForgotPasswordCompatTest {

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

    private User seedUser(String email, String password) {
        return SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, password);
    }

    /** Runs step 1 and returns both the code and the HTML body it was sent in. */
    private String[] requestResetOtp(String email) throws Exception {
        doNothing().when(emailService).sendHtmlMail(anyString(), anyString(), anyString());
        HttpResponse<String> resp = post("/v1/auth/forgot-password", "{\"email\":\"" + email + "\"}");
        assertThat(resp.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp.body()).get("message").asText())
                .isEqualTo("OTP sent successfully to your registered email");

        org.mockito.ArgumentCaptor<String> html = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlMail(eq(email), eq("Reset Your Password - SuperMe"), html.capture());
        String body = html.getValue();
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("monospace;\">(\\d{4})</div>").matcher(body);
        assertThat(m.find()).isTrue();
        return new String[]{m.group(1), body};
    }

    @Test
    void fullResetFlow_sendOtp_verifyOtp_resetPassword_thenLoginWithTheNewPassword() throws Exception {
        String email = "reset-" + System.nanoTime() + "@yopmail.com";
        User user = seedUser(email, "OldPassword1");

        String[] sent = requestResetOtp(email);
        String otp = sent[0];

        // The reset mail is their branded template, not a plain-text code.
        String html = sent[1];
        assertThat(html).startsWith("<!DOCTYPE html>");
        assertThat(html).contains("Reset your password");
        assertThat(html).contains("Your Reset OTP");
        // Their red/orange "action required" header, distinct from the indigo verification mail.
        assertThat(html).contains("linear-gradient(135deg,#f97316 0%,#ef4444 100%)");
        assertThat(html).contains("Expires in 2 minutes");
        assertThat(html).contains(otp);

        // 2. verify-otp
        HttpResponse<String> verified = post("/v1/auth/forgot-password/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        assertThat(verified.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(verified.body()).get("message").asText())
                .isEqualTo("OTP verified successfully. You may now reset your password.");

        // 3. reset-password
        HttpResponse<String> reset = post("/v1/auth/forgot-password/reset-password",
                "{\"email\":\"" + email + "\",\"password\":\"NewPassword1\"}");
        assertThat(reset.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(reset.body()).get("success").asBoolean()).isTrue();

        assertThat(passwordEncoder.matches("NewPassword1",
                userPasswordRepository.findByUser(user).orElseThrow().getPassword())).isTrue();

        // The new password works on the compat login.
        HttpResponse<String> login = post("/v1/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"NewPassword1\"}");
        assertThat(login.statusCode()).isEqualTo(200);

        // One-time use: the window closed, so a second reset is refused.
        HttpResponse<String> replay = post("/v1/auth/forgot-password/reset-password",
                "{\"email\":\"" + email + "\",\"password\":\"AnotherPass1\"}");
        assertThat(replay.statusCode()).isEqualTo(400);
        assertThat(objectMapper.readTree(replay.body()).get("message").asText())
                .isEqualTo("Password reset session expired. Please verify your OTP again.");
    }

    @Test
    void sendOtp_forAnUnknownAddress_is404() throws Exception {
        HttpResponse<String> resp = post("/v1/auth/forgot-password",
                "{\"email\":\"nobody-" + System.nanoTime() + "@yopmail.com\"}");

        assertThat(resp.statusCode()).isEqualTo(404);
        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("success").asBoolean()).isFalse();
        assertThat(body.get("message").asText()).isEqualTo("No account registered with this email address.");
        verifyNoInteractions(emailService);
    }

    @Test
    void resetPassword_withoutVerifyingFirst_isRefused() throws Exception {
        String email = "reset-unverified-" + System.nanoTime() + "@yopmail.com";
        seedUser(email, "OldPassword1");
        requestResetOtp(email); // requested, but never verified

        HttpResponse<String> resp = post("/v1/auth/forgot-password/reset-password",
                "{\"email\":\"" + email + "\",\"password\":\"NewPassword1\"}");

        assertThat(resp.statusCode()).isEqualTo(400);
        assertThat(objectMapper.readTree(resp.body()).get("message").asText())
                .isEqualTo("Password reset session expired. Please verify your OTP again.");
    }

    @Test
    void verifyOtp_rejectsAWrongCode() throws Exception {
        String email = "reset-wrong-" + System.nanoTime() + "@yopmail.com";
        seedUser(email, "OldPassword1");
        requestResetOtp(email);

        HttpResponse<String> resp = post("/v1/auth/forgot-password/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"0000\"}");

        assertThat(resp.statusCode()).isEqualTo(400);
        assertThat(objectMapper.readTree(resp.body()).get("message").asText())
                .isEqualTo("Invalid OTP. Please check and try again.");
    }

    /** Their password rules, reproduced - a too-common password is refused by name. */
    @Test
    void resetPassword_appliesTheirPasswordStrengthRules() throws Exception {
        String email = "reset-weak-" + System.nanoTime() + "@yopmail.com";
        seedUser(email, "OldPassword1");
        String otp = requestResetOtp(email)[0];
        post("/v1/auth/forgot-password/verify-otp", "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");

        HttpResponse<String> resp = post("/v1/auth/forgot-password/reset-password",
                "{\"email\":\"" + email + "\",\"password\":\"qwerty\"}");

        assertThat(resp.statusCode()).isEqualTo(400);
        assertThat(objectMapper.readTree(resp.body()).get("message").asText())
                .isEqualTo("This password is too common. Please choose a stronger password.");
    }

    /** The registration OTP uses the other template - indigo, and a different subject. */
    @Test
    void registrationOtp_usesTheirBrandedVerificationTemplate() throws Exception {
        doNothing().when(emailService).sendHtmlMail(anyString(), anyString(), anyString());
        String email = "verify-mail-" + System.nanoTime() + "@yopmail.com";

        post("/v1/api/auth/send-otp", "{\"email\":\"" + email + "\"}");

        org.mockito.ArgumentCaptor<String> html = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlMail(eq(email), eq("Your OTP Verification Code - SuperMe"), html.capture());

        String body = html.getValue();
        assertThat(body).contains("Verify your email");
        assertThat(body).contains("One-Time Password");
        assertThat(body).contains("linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%)");
        assertThat(body).contains("SuperMe will never ask for your OTP via phone or email.");
        assertThat(body).contains("Expires in 2 minutes");
    }
}
