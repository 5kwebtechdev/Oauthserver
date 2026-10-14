package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.test.context.ActiveProfiles;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.model.User;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class PkceAuthorizationFlowTest {

    @LocalServerPort
    private int port;

    @Autowired
    private RegisteredClientRepository registeredClientRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final Pattern CSRF_PATTERN = Pattern.compile("name=\"_csrf\"[^>]*value=\"([^\"]+)\"");

    private String baseUrl;
    private HttpClient http;
    private static final String PUBLIC_CLIENT_ID = "pkce-angular-client";
    private static final String PUBLIC_REDIRECT_URI = "http://localhost:4200/callback";
    private String confidentialClientId;
    private static final String CONFIDENTIAL_SECRET = "test-secret";

    /**
     * A real SuperMeBE-shaped account, created per test. There is no seeded demo user to log in as
     * any more: users live in SuperMeBE's User table and seeding fake ones into a production
     * schema is not something this server does - see ClientRegistrationSeeder.
     */
    private static final String TEST_PASSWORD = "TestPassword123!";
    private User testUser;

    @BeforeEach
    void setUp() {
        baseUrl = "http://localhost:" + port;
        http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();

        testUser = SupermeUserFixture.saveWithPassword(userRepository, userPasswordRepository,
                passwordEncoder, "pkce-flow-" + System.nanoTime() + "@example.com", TEST_PASSWORD);

        confidentialClientId = "test-confidential-" + UUID.randomUUID();
        registeredClientRepository.save(RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(confidentialClientId)
                .clientSecret(passwordEncoder.encode(CONFIDENTIAL_SECRET))
                .clientAuthenticationMethod(ClientAuthenticationMethod.CLIENT_SECRET_BASIC)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .redirectUri("https://example.com/callback")
                .scope("openid")
                .clientSettings(ClientSettings.builder().requireAuthorizationConsent(false).build())
                .tokenSettings(org.springframework.security.oauth2.server.authorization.settings.TokenSettings.builder()
                        .reuseRefreshTokens(false)
                        .build())
                .build());
    }

    // ---- helpers -----------------------------------------------------

    @Test
    void directLogin_redirectsToFrontend() throws Exception {
        assertThat(loginAsTestUser()).isEqualTo("http://localhost:4200/");
    }

    @Test
    void loginFromRoot_returnsToFrontendInsteadOf404() throws Exception {
        HttpResponse<String> root = send(HttpRequest.newBuilder(URI.create(baseUrl + "/")).GET());
        assertThat(root.statusCode()).isEqualTo(302);
        String target = loginAsTestUser();
        if (target.startsWith(baseUrl + "/")) {
            HttpResponse<String> response = send(HttpRequest.newBuilder(URI.create(target)).GET());
            assertThat(response.statusCode()).isEqualTo(302);
            assertThat(response.headers().firstValue("Location")).contains("http://localhost:4200/");
        } else {
            assertThat(target).isEqualTo("http://localhost:4200/");
        }
    }

    private String loginAsTestUser() throws Exception {
        return login(testUser.getEmail(), TEST_PASSWORD);
    }

    private String login(String username, String password) throws Exception {
        HttpResponse<String> loginPage = send(HttpRequest.newBuilder(URI.create(baseUrl + "/login")).GET());
        Matcher m = CSRF_PATTERN.matcher(loginPage.body());
        assertThat(m.find()).isTrue();
        String csrf = m.group(1);

        String form = "username=" + java.net.URLEncoder.encode(username, StandardCharsets.UTF_8)
                + "&password=" + password + "&_csrf=" + csrf;
        HttpResponse<String> loginResp = send(HttpRequest.newBuilder(URI.create(baseUrl + "/login"))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded"));
        assertThat(loginResp.statusCode()).isEqualTo(302);
        return loginResp.headers().firstValue("Location").orElseThrow();
    }

    private HttpResponse<String> authorize(String clientId, String redirectUri, String scope,
                                            String codeChallenge, String state) throws Exception {
        StringBuilder qs = new StringBuilder("response_type=code")
                .append("&client_id=").append(clientId)
                .append("&redirect_uri=").append(java.net.URLEncoder.encode(redirectUri, StandardCharsets.UTF_8))
                .append("&scope=").append(java.net.URLEncoder.encode(scope, StandardCharsets.UTF_8))
                .append("&state=").append(state);
        if (codeChallenge != null) {
            qs.append("&code_challenge=").append(codeChallenge).append("&code_challenge_method=S256");
        }
        return send(HttpRequest.newBuilder(URI.create(baseUrl + "/oauth2/authorize?" + qs)).GET());
    }

    private HttpResponse<String> send(HttpRequest.Builder builder) throws Exception {
        return http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
    }

    private JsonNode tokenRequest(Map<String, String> params, String basicAuthOrNull) throws Exception {
        String form = params.entrySet().stream()
                .map(e -> e.getKey() + "=" + java.net.URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(baseUrl + "/oauth2/token"))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded");
        if (basicAuthOrNull != null) {
            builder.header("Authorization", "Basic " + Base64.getEncoder()
                    .encodeToString(basicAuthOrNull.getBytes(StandardCharsets.UTF_8)));
        }
        HttpResponse<String> resp = send(builder);
        com.fasterxml.jackson.databind.node.ObjectNode node =
                (com.fasterxml.jackson.databind.node.ObjectNode) objectMapper.readTree(resp.body());
        return node.put("__status", resp.statusCode());
    }

    private static String b64url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private static String sha256(String value) throws NoSuchAlgorithmException {
        return b64url(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static Map<String, String> parseQuery(String location) {
        String query = location.substring(location.indexOf('?') + 1);
        return java.util.Arrays.stream(query.split("&"))
                .map(p -> p.split("=", 2))
                .collect(Collectors.toMap(p -> p[0], p -> java.net.URLDecoder.decode(p[1], StandardCharsets.UTF_8)));
    }

    // ---- tests ---------------------------------------------------------

    @Test
    void pkceAuthorizationCodeFlow_succeedsAndIssuesRefreshTokenForPublicClient() throws Exception {
        // Public clients DO get a refresh token here - see
        // PkceAwarePublicClientAuthenticationProvider / PkceAwareRefreshTokenGenerator
        // for why this deliberately overrides Spring's stock behavior.
        loginAsTestUser();

        String verifier = b64url("verifier-1234567890-abcdefghijklmnopqrstuvwxyz".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid profile notes.read", challenge, "state-1");
        assertThat(authResp.statusCode()).isEqualTo(302);
        Map<String, String> params = parseQuery(authResp.headers().firstValue("Location").orElseThrow());
        assertThat(params).containsEntry("state", "state-1");
        String code = params.get("code");
        assertThat(code).isNotBlank();

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        ), null);

        assertThat(tokens.get("__status").asInt()).isEqualTo(200);
        assertThat(tokens.has("access_token")).isTrue();
        assertThat(tokens.has("refresh_token")).isTrue();
    }

    @Test
    void refreshTokenRotation_andReuseDetectionRevokesChain_forPublicClient() throws Exception {
        loginAsTestUser();

        String verifier = b64url("public-refresh-rotation-verifier-abcdefghij".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid notes.read", challenge, "state-pub-refresh");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        ), null);
        assertThat(tokens.get("__status").asInt()).isEqualTo(200);
        String refreshToken = tokens.get("refresh_token").asText();
        assertThat(refreshToken).isNotBlank();

        // No client_secret, no code_verifier on a refresh_token grant - just client_id,
        // exactly what the public SPA client actually sends.
        JsonNode rotated = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken,
                "client_id", PUBLIC_CLIENT_ID
        ), null);
        assertThat(rotated.get("__status").asInt()).isEqualTo(200);
        String newRefreshToken = rotated.get("refresh_token").asText();
        assertThat(newRefreshToken).isNotEqualTo(refreshToken);

        // Replay the OLD (superseded) refresh token.
        JsonNode replay = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken,
                "client_id", PUBLIC_CLIENT_ID
        ), null);
        assertThat(replay.get("__status").asInt()).isEqualTo(400);

        // Reuse must revoke the whole chain - the rotated token fails too.
        JsonNode afterRevocation = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", newRefreshToken,
                "client_id", PUBLIC_CLIENT_ID
        ), null);
        assertThat(afterRevocation.get("__status").asInt()).isEqualTo(400);
    }

    @Test
    void idToken_audienceIsTheClientId_accessToken_audienceIsTheResourceServer() throws Exception {
        // Regression test: the token customizer once applied the resource-server
        // audience to every JWT it signed, including the ID token. OIDC requires the ID
        // token's "aud" to be the client_id; a wrong "aud" there makes OIDC-conformant
        // clients (angular-oauth2-oidc included) reject the whole login client-side.
        loginAsTestUser();
        String verifier = b64url("aud-claim-check-verifier-abcdefghijklmnopqrst".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid profile", challenge, "state-aud");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        ), null);
        assertThat(tokens.get("__status").asInt()).isEqualTo(200);

        assertThat(decodeAudience(tokens.get("id_token").asText())).containsExactly(PUBLIC_CLIENT_ID);
        assertThat(decodeAudience(tokens.get("access_token").asText())).containsExactly("pkce-resource-server");
    }

    private java.util.List<String> decodeAudience(String jwt) throws Exception {
        String payload = jwt.split("\\.")[1];
        payload = payload + "=".repeat((4 - payload.length() % 4) % 4);
        JsonNode claims = objectMapper.readTree(Base64.getUrlDecoder().decode(payload));
        JsonNode aud = claims.get("aud");
        java.util.List<String> result = new java.util.ArrayList<>();
        if (aud.isArray()) {
            aud.forEach(n -> result.add(n.asText()));
        } else {
            result.add(aud.asText());
        }
        return result;
    }

    @Test
    void tokenExchange_wrongCodeVerifier_isRejected() throws Exception {
        loginAsTestUser();
        String verifier = b64url("correct-verifier-abcdefghijklmnopqrstuvwxyz".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid", challenge, "state-2");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", "totally-wrong-verifier-value-xxxxxxxxxxxxxxx"
        ), null);

        assertThat(tokens.get("__status").asInt()).isEqualTo(400);
        assertThat(tokens.get("error").asText()).isEqualTo("invalid_grant");
    }

    @Test
    void authorizationCode_isSingleUse() throws Exception {
        loginAsTestUser();
        String verifier = b64url("single-use-verifier-abcdefghijklmnopqrstuvwx".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid", challenge, "state-3");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        Map<String, String> tokenParams = Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        );

        JsonNode first = tokenRequest(tokenParams, null);
        assertThat(first.get("__status").asInt()).isEqualTo(200);

        JsonNode second = tokenRequest(tokenParams, null);
        assertThat(second.get("__status").asInt()).isEqualTo(400);
        assertThat(second.get("error").asText()).isEqualTo("invalid_grant");
    }

    @Test
    void authorize_unauthorizedRedirectUri_isRejected() throws Exception {
        loginAsTestUser();
        String verifier = b64url("redirect-check-verifier-abcdefghijklmnopqrst".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, "https://evil.example.com/callback",
                "openid", challenge, "state-4");

        // Spring Authorization Server refuses to redirect to an unregistered redirect_uri
        // (it cannot be trusted) - it renders a direct error response instead of a 302.
        assertThat(authResp.statusCode()).isNotEqualTo(302);
    }

    @Test
    void silentReAuthentication_issuesFreshAccessTokenOnActiveSession() throws Exception {
        loginAsTestUser();

        String verifier1 = b64url("first-run-verifier-abcdefghijklmnopqrstuvwx".getBytes(StandardCharsets.UTF_8));
        HttpResponse<String> first = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI, "openid",
                sha256(verifier1), "state-a");
        String code1 = parseQuery(first.headers().firstValue("Location").orElseThrow()).get("code");
        JsonNode tokens1 = tokenRequest(Map.of(
                "grant_type", "authorization_code", "code", code1, "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID, "code_verifier", verifier1
        ), null);
        assertThat(tokens1.get("__status").asInt()).isEqualTo(200);

        // No re-login: the session cookie from the first login is still valid.
        String verifier2 = b64url("second-run-verifier-abcdefghijklmnopqrstuvw".getBytes(StandardCharsets.UTF_8));
        HttpResponse<String> second = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI, "openid",
                sha256(verifier2), "state-b");
        assertThat(second.statusCode()).isEqualTo(302);
        String code2 = parseQuery(second.headers().firstValue("Location").orElseThrow()).get("code");
        assertThat(code2).isNotBlank();

        JsonNode tokens2 = tokenRequest(Map.of(
                "grant_type", "authorization_code", "code", code2, "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID, "code_verifier", verifier2
        ), null);
        assertThat(tokens2.get("__status").asInt()).isEqualTo(200);
    }

    @Test
    void tokenResponse_includesUserInfo_withoutDroppingIdToken() throws Exception {
        // Regression test for a bug caught during implementation: the "user" additional
        // parameter was originally added via additionalParameters(Map.of("user", ...)),
        // which is a plain setter, not a merge - it silently overwrote whatever the
        // default handler had already put there, including id_token for any request with
        // the openid scope. UserInfoAccessTokenResponseCustomizer now merges instead.
        loginAsTestUser();
        String verifier = b64url("user-info-check-verifier-abcdefghijklmnopqrst".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid profile notes.read", challenge, "state-userinfo");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        ), null);
        assertThat(tokens.get("__status").asInt()).isEqualTo(200);

        // The bug this guards against: id_token must survive alongside "user".
        assertThat(tokens.has("id_token")).isTrue();
        assertThat(tokens.get("id_token").asText()).isNotBlank();

        JsonNode user = tokens.get("user");
        assertThat(user).isNotNull();

        // The payload is SuperMeBE's own UserDTO, so a client sees the same keys here as it does
        // from their /auth/login. Asserted as an exact key set because drifting from their shape
        // is the thing that would break a client consuming both.
        java.util.List<String> keys = new java.util.ArrayList<>();
        user.fieldNames().forEachRemaining(keys::add);
        assertThat(keys).containsExactlyInAnyOrder(
                "id", "name", "username", "email", "phone", "gender", "dateOfBirth", "age",
                "relationship", "role", "referralCode", "onboardingStep", "family", "familyMembers",
                "avatar", "pet", "lastDailyBonusDate", "asChild", "coins");

        assertThat(user.get("email").asText()).isEqualTo(testUser.getEmail());
        assertThat(user.get("role").asText()).isEqualTo("USER");
        assertThat(user.get("relationship").asText()).isEqualTo("SELF");
        assertThat(user.get("age").asInt()).isPositive();

        // Regression check: the token endpoint's own Jackson converter (not the
        // Spring-Boot-autoconfigured one every other endpoint uses) serializes a raw LocalDate as
        // a numeric array, not an ISO string. SupermeUserInfoService converts the DTO with the
        // configured ObjectMapper specifically so these come out as strings, like theirs do.
        assertThat(user.get("dateOfBirth").isTextual()).isTrue();
        assertThat(user.get("dateOfBirth").asText()).isEqualTo("1990-01-01");

        // Also present (and still doesn't drop anything) on a refresh_token grant.
        String refreshToken = tokens.get("refresh_token").asText();
        JsonNode rotated = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken,
                "client_id", PUBLIC_CLIENT_ID
        ), null);
        assertThat(rotated.get("__status").asInt()).isEqualTo(200);
        assertThat(rotated.get("user").get("email").asText()).isEqualTo(testUser.getEmail());
    }

    /**
     * Reproduces a reported bug: logout worked before a token refresh and failed after it. RP-
     * initiated logout is validated by looking the authorization up by the id_token_hint value
     * (OidcLogoutAuthenticationProvider does findByToken(hint, ID_TOKEN) first), so if the refresh
     * grant rotates the stored ID token without handing the new one back, the client keeps sending
     * the old value and the lookup finds nothing - "invalid_token", the error page the user saw.
     *
     * The refresh response must therefore carry id_token, which is also what makes
     * angular-oauth2-oidc store it (it only calls storeIdToken when the response contains one).
     */
    @Test
    void refreshGrant_returnsAFreshIdToken_soLogoutStillWorksAfterwards() throws Exception {
        loginAsTestUser();
        String verifier = b64url("logout-after-refresh-verifier-abcdefghijkl".getBytes(StandardCharsets.UTF_8));
        String challenge = sha256(verifier);

        HttpResponse<String> authResp = authorize(PUBLIC_CLIENT_ID, PUBLIC_REDIRECT_URI,
                "openid profile notes.read", challenge, "state-logout");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", PUBLIC_REDIRECT_URI,
                "client_id", PUBLIC_CLIENT_ID,
                "code_verifier", verifier
        ), null);
        assertThat(tokens.get("__status").asInt()).isEqualTo(200);
        String originalIdToken = tokens.get("id_token").asText();

        JsonNode refreshed = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", tokens.get("refresh_token").asText(),
                "client_id", PUBLIC_CLIENT_ID
        ), null);
        assertThat(refreshed.get("__status").asInt()).isEqualTo(200);

        // The heart of it: without this the client has no way to learn the new ID token.
        assertThat(refreshed.has("id_token"))
                .as("refresh_token grant must return a fresh id_token, or logout breaks afterwards")
                .isTrue();
        String refreshedIdToken = refreshed.get("id_token").asText();
        assertThat(refreshedIdToken).isNotBlank();

        // Logging out with the ID token the refresh handed back succeeds.
        HttpResponse<String> logout = send(HttpRequest.newBuilder(URI.create(baseUrl + "/connect/logout"
                + "?id_token_hint=" + refreshedIdToken
                + "&post_logout_redirect_uri=" + java.net.URLEncoder.encode("http://localhost:4200/", StandardCharsets.UTF_8)
                + "&client_id=" + PUBLIC_CLIENT_ID)).GET());
        assertThat(logout.statusCode())
                .as("logout after a refresh should redirect, not render an error")
                .isEqualTo(302);
        assertThat(logout.headers().firstValue("Location").orElseThrow())
                .startsWith("http://localhost:4200/");

        // And the superseded one is rejected - the exact failure the user hit.
        if (!refreshedIdToken.equals(originalIdToken)) {
            loginAsTestUser();
            HttpResponse<String> stale = send(HttpRequest.newBuilder(URI.create(baseUrl + "/connect/logout"
                    + "?id_token_hint=" + originalIdToken
                    + "&post_logout_redirect_uri=" + java.net.URLEncoder.encode("http://localhost:4200/", StandardCharsets.UTF_8)
                    + "&client_id=" + PUBLIC_CLIENT_ID)).GET());
            assertThat(stale.statusCode())
                    .as("a superseded id_token_hint must not be accepted")
                    .isNotEqualTo(302);
        }
    }

    @Test
    void refreshTokenRotation_andReuseDetectionRevokesChain_forConfidentialClient() throws Exception {
        loginAsTestUser();

        HttpResponse<String> authResp = authorize(confidentialClientId, "https://example.com/callback",
                "openid", null, "state-5");
        String code = parseQuery(authResp.headers().firstValue("Location").orElseThrow()).get("code");

        String basicAuth = confidentialClientId + ":" + CONFIDENTIAL_SECRET;
        JsonNode tokens = tokenRequest(Map.of(
                "grant_type", "authorization_code",
                "code", code,
                "redirect_uri", "https://example.com/callback"
        ), basicAuth);
        assertThat(tokens.get("__status").asInt()).isEqualTo(200);
        String refreshToken = tokens.get("refresh_token").asText();
        assertThat(refreshToken).isNotBlank();

        JsonNode rotated = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken
        ), basicAuth);
        assertThat(rotated.get("__status").asInt()).isEqualTo(200);
        String newRefreshToken = rotated.get("refresh_token").asText();
        assertThat(newRefreshToken).isNotEqualTo(refreshToken);

        // Replay the OLD (superseded) refresh token.
        JsonNode replay = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", refreshToken
        ), basicAuth);
        assertThat(replay.get("__status").asInt()).isEqualTo(400);

        // The reuse must have revoked the whole chain - even the still-fresh rotated
        // refresh token must now fail too.
        JsonNode afterRevocation = tokenRequest(Map.of(
                "grant_type", "refresh_token",
                "refresh_token", newRefreshToken
        ), basicAuth);
        assertThat(afterRevocation.get("__status").asInt()).isEqualTo(400);
    }
}
