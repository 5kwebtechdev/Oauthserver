package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.interfaces.RSAPrivateKey;
import java.time.Instant;
import java.util.Date;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * /api/admin/users must require ROLE_ADMIN, same as resource-server's /api/admin/notes.
 * Since this validates tokens against its OWN live JWKS (/oauth2/jwks), these tokens are
 * signed with the REAL test-keys private key - not mocked, an actual end-to-end check.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class AdminUsersApiTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private String signToken(String subject, String... roles) throws Exception {
        RSAPrivateKey privateKey = loadTestPrivateKey();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .subject(subject)
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

    private RSAPrivateKey loadTestPrivateKey() throws Exception {
        String pem = java.nio.file.Files.readString(java.nio.file.Path.of("src/test/resources/test-keys/private_key.pem"))
                .replaceAll("-----BEGIN [A-Z ]+-----", "")
                .replaceAll("-----END [A-Z ]+-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = java.util.Base64.getMimeDecoder().decode(pem);
        java.security.KeyFactory kf = java.security.KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(new java.security.spec.PKCS8EncodedKeySpec(decoded));
    }

    private HttpResponse<String> callUsersApi(String token) throws Exception {
        HttpClient http = HttpClient.newHttpClient();
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/admin/users")).GET();
        if (token != null) {
            builder.header("Authorization", "Bearer " + token);
        }
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void noToken_isUnauthorized() throws Exception {
        assertThat(callUsersApi(null).statusCode()).isEqualTo(401);
    }

    @Test
    void userRoleOnly_isForbidden() throws Exception {
        String token = signToken("demo", "ROLE_USER");
        assertThat(callUsersApi(token).statusCode()).isEqualTo(403);
    }

    @Test
    void adminRole_seesPagedUserList() throws Exception {
        String email = "admin-list-" + System.nanoTime() + "@example.com";
        User seeded = SupermeUserFixture.saveWithPassword(
                userRepository, userPasswordRepository, passwordEncoder, email, "Password123!");

        String token = signToken("admin", "ROLE_ADMIN");
        HttpResponse<String> resp = callUsersApi(token);
        assertThat(resp.statusCode()).isEqualTo(200);

        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("total").asInt()).isGreaterThanOrEqualTo(1);
        assertThat(body.get("users").isArray()).isTrue();
        // Paged rather than findAll(): the live table holds every real user of the app.
        assertThat(body.has("page")).isTrue();
        assertThat(body.has("size")).isTrue();
        assertThat(body.has("totalPages")).isTrue();

        boolean seededPresent = false;
        for (JsonNode user : body.get("users")) {
            if (seeded.getId().equals(user.get("id").asLong())) {
                seededPresent = true;
                // No OAuth provider linked, so the derived provider reads as LOCAL.
                assertThat(user.get("authProvider").asText()).isEqualTo("LOCAL");
                assertThat(user.get("email").asText()).isEqualTo(email);
                assertThat(user.get("role").asText()).isEqualTo("USER");
            }
        }
        assertThat(seededPresent).isTrue();
    }
}
