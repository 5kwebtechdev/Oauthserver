package com.pkce.authserver;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

/**
 * Deliberately does NOT mock EmailService (other tests do, to capture the plain OTP) -
 * mocks JavaMailSender instead, one layer lower, so the real @Async-annotated
 * EmailService.sendOtpEmail actually runs through its Spring AOP proxy. Proves the fix
 * for the finding in ARCHITECTURE.md section 13a: a slow/failing mail send must not block
 * or fail the HTTP response, both for resilience and so response latency can't be used to
 * infer whether an account/email existed (the whole point of "same response either way").
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class OtpEmailAsyncTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @MockBean
    private JavaMailSender mailSender;

    @Test
    void slowFailingMailSend_doesNotBlockOrFail_theHttpResponse() throws Exception {
        String email = "async-fp-" + System.nanoTime() + "@example.com";
        SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, "OldPassword123!");

        // Simulates a slow, ultimately-failing SMTP round trip - well longer than any
        // reasonable HTTP response time, so the assertion below only passes if the send
        // genuinely isn't on the request thread.
        doAnswer(invocation -> {
            Thread.sleep(2000);
            throw new MailAuthenticationException("simulated SMTP auth failure");
        }).when(mailSender).send(any(SimpleMailMessage.class));

        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/forgot-password/request"))
                .POST(HttpRequest.BodyPublishers.ofString("{\"username\":\"" + email + "\"}"))
                .header("Content-Type", "application/json")
                .build();

        long start = System.nanoTime();
        HttpResponse<String> resp = HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        assertThat(resp.statusCode()).isEqualTo(200);
        assertThat(elapsedMs).isLessThan(1000);
    }
}
