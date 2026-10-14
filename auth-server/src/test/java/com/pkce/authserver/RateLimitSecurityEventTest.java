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
 * RateLimitFilter's buckets are an in-memory singleton that Spring's test context caching
 * keeps alive across every test class sharing the same (default) configuration - see the
 * generous capacities in application-test.yml, sized so normal suite traffic never trips
 * them by accident. Deliberately tripping a limit to prove it records a security event
 * therefore needs a genuinely low capacity, which would poison every other test sharing
 * that same cached context if done there - hence the property override below, which gives
 * this class its OWN distinct context (and thus its own untouched buckets), isolated in
 * both directions from every other test class.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"app.rate-limit.otp-request.capacity=3", "app.rate-limit.otp-request.refill-tokens=3"}
)
@ActiveProfiles("test")
class RateLimitSecurityEventTest {

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

    private String signAdminToken() throws Exception {
        String pem = java.nio.file.Files.readString(java.nio.file.Path.of("src/test/resources/test-keys/private_key.pem"))
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = java.util.Base64.getMimeDecoder().decode(pem);
        RSAPrivateKey privateKey = (RSAPrivateKey) java.security.KeyFactory.getInstance("RSA")
                .generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(decoded));

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject("admin")
                .issuer("http://localhost:9000")
                .audience("pkce-resource-server")
                .claim("roles", java.util.List.of("ROLE_ADMIN"))
                .issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(300)))
                .build();
        SignedJWT jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID("test-key-1").build(), claims);
        jwt.sign(new RSASSASigner(privateKey));
        return jwt.serialize();
    }

    @Test
    void trippingTheLimit_recordsASecurityEvent() throws Exception {
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());

        String email = "ratelimit-" + System.nanoTime() + "@example.com";
        // Capacity 3 (this class's own override) - the 4th call in quick succession must 429.
        HttpResponse<String> last = null;
        for (int i = 0; i < 4; i++) {
            last = postJson("/api/auth/continue-with-email/request", "{\"email\":\"" + email + "-" + i + "\"}");
        }
        assertThat(last.statusCode()).isEqualTo(429);

        HttpRequest listReq = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/admin/security-events"))
                .header("Authorization", "Bearer " + signAdminToken())
                .GET().build();
        HttpResponse<String> listResp = HttpClient.newHttpClient().send(listReq, HttpResponse.BodyHandlers.ofString());
        assertThat(listResp.statusCode()).isEqualTo(200);

        JsonNode events = objectMapper.readTree(listResp.body());
        boolean found = false;
        for (JsonNode event : events) {
            if ("RATE_LIMIT_EXCEEDED".equals(event.get("eventType").asText())
                    && event.get("details").asText().contains("continue-with-email/request")) {
                found = true;
            }
        }
        assertThat(found).isTrue();
    }
}
