package com.pkce.authserver;

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
 * Password reset requires a real, emailed one-time code (OtpService/EmailService) - EmailService is
 * mocked so these tests can capture the code and complete the flow without actually calling Gmail,
 * the same way ContinueWithEmailAndProfileTest does.
 *
 * The reset writes SuperMeBE's UserPassword row, so it only runs with app.superme.writes-enabled,
 * which application-test.yml turns on against H2's throwaway copy of that table.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class ForgotPasswordFlowTest {

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

    private HttpResponse<String> postJson(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        return HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
    }

    private User seedUser(String email) {
        return SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, "OldPassword123!");
    }

    private String storedHashOf(User user) {
        return userPasswordRepository.findByUser(user).orElseThrow().getPassword();
    }

    @Test
    void requestReset_forAccountWithEmail_sendsRealOtp_andResetWorksOnce() throws Exception {
        String email = "fp-user-" + System.nanoTime() + "@example.com";
        User user = seedUser(email);

        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());

        HttpResponse<String> requestResp = postJson("/api/auth/forgot-password/request",
                "{\"username\":\"" + email + "\"}");
        assertThat(requestResp.statusCode()).isEqualTo(200);

        org.mockito.ArgumentCaptor<String> otpCaptor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(emailService).sendOtpEmail(eq(email), otpCaptor.capture());
        String otp = otpCaptor.getValue();
        assertThat(otp).matches("\\d{6}");

        HttpResponse<String> wrongOtp = postJson("/api/auth/forgot-password/reset",
                "{\"username\":\"" + email + "\",\"otp\":\"000000\",\"newPassword\":\"NewPassword123!\"}");
        assertThat(wrongOtp.statusCode()).isEqualTo(400);

        HttpResponse<String> reset = postJson("/api/auth/forgot-password/reset",
                "{\"username\":\"" + email + "\",\"otp\":\"" + otp + "\",\"newPassword\":\"NewPassword123!\"}");
        assertThat(reset.statusCode()).isEqualTo(200);

        assertThat(passwordEncoder.matches("NewPassword123!", storedHashOf(user))).isTrue();

        // Single-use: replaying the same code must now fail even though it was correct.
        HttpResponse<String> replay = postJson("/api/auth/forgot-password/reset",
                "{\"username\":\"" + email + "\",\"otp\":\"" + otp + "\",\"newPassword\":\"AnotherPassword123!\"}");
        assertThat(replay.statusCode()).isEqualTo(400);
    }

    @Test
    void requestReset_forAccountWithNoEmail_sendsNothing_butStillReturns200() throws Exception {
        // Phone-only accounts are a real case over there: User.email is nullable because an
        // account can be registered with a phone number alone, and there is then no address to
        // send a reset code to.
        String phone = "+91 91234" + (10000 + (int) (System.nanoTime() % 80000));
        User user = SupermeUserFixture.user(null);
        user.setPhone(phone);
        userRepository.save(user);

        HttpResponse<String> requestResp = postJson("/api/auth/forgot-password/request",
                "{\"username\":\"" + phone + "\"}");
        assertThat(requestResp.statusCode()).isEqualTo(200);
        verifyNoInteractions(emailService);
    }

    @Test
    void requestReset_forUnknownIdentifier_sendsNothing_andRespondsIdenticallyToAKnownOne() throws Exception {
        HttpResponse<String> unknown = postJson("/api/auth/forgot-password/request",
                "{\"username\":\"definitely-does-not-exist-" + System.nanoTime() + "@example.com\"}");
        assertThat(unknown.statusCode()).isEqualTo(200);
        verifyNoInteractions(emailService);

        String email = "fp-known-" + System.nanoTime() + "@example.com";
        seedUser(email);
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());
        HttpResponse<String> known = postJson("/api/auth/forgot-password/request",
                "{\"username\":\"" + email + "\"}");

        assertThat(unknown.body()).isEqualTo(known.body());
    }
}
