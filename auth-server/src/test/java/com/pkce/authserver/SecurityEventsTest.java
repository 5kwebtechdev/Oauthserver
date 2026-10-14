package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.pkce.authserver.service.EmailService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;

/**
 * RATE_LIMIT_EXCEEDED event recording is covered separately in
 * RateLimitSecurityEventTest, which needs its own low-capacity context to trip a limit
 * deterministically - see that class's Javadoc for why it can't share this one's context.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SecurityEventsTest {

    @LocalServerPort
    private int port;

    @MockBean
    private EmailService emailService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HttpResponse<String> postJson(String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        return HttpClient.newHttpClient().send(req, HttpResponse.BodyHandlers.ofString());
    }

    private String signToken(String... roles) throws Exception {
        String pem = java.nio.file.Files.readString(java.nio.file.Path.of("src/test/resources/test-keys/private_key.pem"))
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = java.util.Base64.getMimeDecoder().decode(pem);
        RSAPrivateKey privateKey = (RSAPrivateKey) java.security.KeyFactory.getInstance("RSA")
                .generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(decoded));

        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .subject("test-subject")
                .issuer("http://localhost:9000")
                .audience("pkce-resource-server")
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(300)));
        if (roles.length > 0) {
            claims.claim("roles", java.util.List.of(roles));
        }
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key-1").build(), claims.build());
        jwt.sign(new RSASSASigner(privateKey));
        return jwt.serialize();
    }

    private String signAdminToken() throws Exception {
        return signToken("ROLE_ADMIN", "ROLE_USER");
    }

    private HttpResponse<String> listSecurityEvents(String token) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/admin/security-events")).GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return HttpClient.newHttpClient().send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void noToken_isUnauthorized() throws Exception {
        assertThat(listSecurityEvents(null).statusCode()).isEqualTo(401);
    }

    @Test
    void userRoleOnly_isForbidden() throws Exception {
        assertThat(listSecurityEvents(signToken("ROLE_USER")).statusCode()).isEqualTo(403);
    }

    @Test
    void adminRole_canListEvents() throws Exception {
        assertThat(listSecurityEvents(signAdminToken()).statusCode()).isEqualTo(200);
    }

    @Test
    void otpVerifyFailure_isRecorded_andVisibleToAdmin() throws Exception {
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());

        String email = "secevt-" + System.nanoTime() + "@example.com";
        postJson("/api/auth/continue-with-email/request", "{\"email\":\"" + email + "\"}");
        HttpResponse<String> wrongOtp = postJson("/api/auth/continue-with-email/verify",
                "{\"email\":\"" + email + "\",\"otp\":\"000000\",\"fullName\":\"x\",\"phoneNumber\":\"1\",\"city\":\"x\"}");
        assertThat(wrongOtp.statusCode()).isEqualTo(400);

        HttpResponse<String> listResp = listSecurityEvents(signAdminToken());
        assertThat(listResp.statusCode()).isEqualTo(200);
        JsonNode events = objectMapper.readTree(listResp.body());

        boolean found = false;
        for (JsonNode event : events) {
            if ("OTP_VERIFY_FAILURE".equals(event.get("eventType").asText()) && email.equals(event.get("identifier").asText())) {
                found = true;
            }
        }
        assertThat(found).isTrue();
    }
}
