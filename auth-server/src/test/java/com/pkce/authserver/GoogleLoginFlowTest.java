package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.enums.AgeGroup;
import com.pkce.authserver.superme.enums.Role;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

/**
 * Covers the part that can't be exercised with a real Google token (no private key to sign one
 * with): the googleIdTokenDecoder bean is mocked to simulate a verified Google identity, so this
 * tests everything downstream of that - matching the account, linking the provider id, session
 * establishment, and resuming the original /oauth2/authorize request via RequestCache.
 *
 * Google sign-in can no longer create an account: SuperMeBE's User table demands name, gender,
 * dateOfBirth and relationship, none of which a Google token carries. An unknown email is a 401.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class GoogleLoginFlowTest {

    @LocalServerPort
    private int port;

    @MockBean
    private JwtDecoder googleIdTokenDecoder;

    @Autowired
    private SupermeUserRepository userRepository;

    @Autowired
    private UserPasswordRepository userPasswordRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String CLIENT_ID = "pkce-angular-client";
    private static final String REDIRECT_URI = "http://localhost:4200/callback";

    private Jwt googleJwt(String email) {
        Instant now = Instant.now();
        return Jwt.withTokenValue("fake-google-token")
                .header("alg", "RS256")
                .claim("iss", "https://accounts.google.com")
                .claim("azp", "124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com")
                .claim("aud", "124581866222-gblqv0k2a75uo4183ahl0u8336nbcsku.apps.googleusercontent.com")
                .claim("sub", "google-sub-" + email)
                .claim("email", email)
                .claim("email_verified", true)
                .claim("picture", "https://example.com/avatar.png")
                .claim("nbf", now.minusSeconds(300).getEpochSecond())
                .issuedAt(now)
                .expiresAt(now.plusSeconds(3600))
                .build();
    }

    private String b64url(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    private String sha256(String value) throws Exception {
        return b64url(MessageDigest.getInstance("SHA-256").digest(value.getBytes()));
    }

    private HttpResponse<String> googleLogin(HttpClient http) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/auth/google-login"))
                .POST(HttpRequest.BodyPublishers.ofString("{\"idToken\":\"fake-google-token\"}"))
                .header("Content-Type", "application/json")
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Sign-in does not create the account, but it does not dead-end either: the Google identity is
     * valid, there is just nothing to sign into yet, so the caller is told what it needs to collect
     * and gets the verified identity back to pre-fill with. RegistrationFlowTest covers what
     * happens next.
     */
    @Test
    void unknownGoogleEmail_asksForRegistration_ratherThanJustFailing() throws Exception {
        String email = "brandnew-" + System.nanoTime() + "@example.com";
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> resp = googleLogin(http);

        assertThat(resp.statusCode()).isEqualTo(404);
        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("registrationRequired").asBoolean()).isTrue();
        assertThat(body.get("email").asText()).isEqualTo(email);
        assertThat(body.get("handoffTicket").asText()).isNotBlank();

        HttpRequest handoff = HttpRequest.newBuilder(URI.create(
                        "http://localhost:" + port + "/api/auth/google-signup-handoff"))
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(
                        java.util.Map.of("ticket", body.get("handoffTicket").asText()))))
                .header("Content-Type", "application/json")
                .build();
        HttpResponse<String> exchange = http.send(handoff, HttpResponse.BodyHandlers.ofString());
        assertThat(exchange.statusCode()).isEqualTo(200);
        JsonNode exchangedIdentity = objectMapper.readTree(exchange.body());
        assertThat(exchangedIdentity.get("provider").asText()).isEqualTo("google");
        assertThat(exchangedIdentity.get("providerId").asText()).isEqualTo("google-sub-" + email);
        assertThat(exchangedIdentity.get("email").asText()).isEqualTo(email);
        assertThat(exchangedIdentity.get("idToken").asText()).isEqualTo("fake-google-token");

        HttpResponse<String> reusedTicket = http.send(handoff, HttpResponse.BodyHandlers.ofString());
        assertThat(reusedTicket.statusCode()).isEqualTo(410);
        // Nothing was created - that only happens when /api/auth/register is called.
        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void existingAccount_signsIn_andProviderIdIsLinked() throws Exception {
        String email = "existing-google-" + System.nanoTime() + "@example.com";
        // No password row: a social-login-only account, which is the common case for this flow and
        // must not be a blocker (131 of the live accounts have no UserPassword at all).
        User seeded = SupermeUserFixture.saveWithoutPassword(userRepository, email);
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> resp = googleLogin(http);

        assertThat(resp.statusCode()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("username").asText()).isEqualTo(email);
        assertThat(body.get("newUser").asBoolean()).isFalse();
        // No prior /oauth2/authorize was hit in this session, so it falls back to the SPA base URL.
        assertThat(body.get("redirectTo").asText()).isEqualTo("http://localhost:4200/");

        User linked = userRepository.findById(seeded.getId()).orElseThrow();
        assertThat(linked.getOauth2ProviderType()).isEqualTo("GOOGLE");
        assertThat(linked.getOauth2ProviderId()).isEqualTo("google-sub-" + email);
        assertThat(linked.getOauth2AvatarUrl()).isEqualTo("https://example.com/avatar.png");
    }

    @Test
    void existingAccountWithLegacyAgeGroup_signsInAndMapsToCurrentBand() throws Exception {
        String email = "legacy-age-google-" + System.nanoTime() + "@example.com";
        User seeded = SupermeUserFixture.user(email);
        seeded.setDateOfBirth(LocalDate.now().minusYears(20));
        seeded = userRepository.save(seeded);
        // This is the value present in the production User.ageGroup ENUM that previously made
        // Hibernate fail before it could finish finding the account by email.
        jdbcTemplate.update("UPDATE User SET ageGroup = ? WHERE id = ?", "AGE_18_TO_24", seeded.getId());
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> resp = googleLogin(http);

        assertThat(resp.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(resp.body()).get("email").asText()).isEqualTo(email);
        assertThat(userRepository.findById(seeded.getId()).orElseThrow().getAgeGroup())
                .isEqualTo(AgeGroup.AGE_18_TO_29);
    }

    /**
     * The live table has several Google subject ids sitting on two or three rows each - those
     * columns carry no unique constraint over there. An Optional-returning derived query threw
     * IncorrectResultSizeDataAccessException on exactly those accounts, which reached the browser
     * as a 500 on "Sign in with Google".
     */
    @Test
    void duplicateProviderIdRows_stillSignIn_ratherThanFailingWith500() throws Exception {
        String sharedSub = "google-sub-dup-" + System.nanoTime();
        String emailA = "dup-a-" + System.nanoTime() + "@example.com";
        String emailB = "dup-b-" + System.nanoTime() + "@example.com";

        User first = SupermeUserFixture.user(emailA);
        first.setOauth2ProviderId(sharedSub);
        first.setOauth2ProviderType("GOOGLE");
        first = userRepository.save(first);

        User second = SupermeUserFixture.user(emailB);
        second.setOauth2ProviderId(sharedSub);
        second.setOauth2ProviderType("GOOGLE");
        userRepository.save(second);

        Jwt jwt = Jwt.withTokenValue("fake-google-token")
                .header("alg", "RS256")
                .claim("iss", "https://accounts.google.com")
                .claim("aud", "some-client-id")
                .claim("sub", sharedSub)
                .claim("email", emailA)
                .claim("email_verified", true)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(jwt);

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> resp = googleLogin(http);

        assertThat(resp.statusCode()).isEqualTo(200);
        // Deterministic: the lowest-id usable row, so the same Google account always lands on the
        // same user instead of alternating between duplicates.
        assertThat(objectMapper.readTree(resp.body()).get("username").asText()).isEqualTo(first.getEmail());
    }

    /**
     * User.email is nullable over there - 45 live accounts are phone-only. Building the response
     * with Map.of blew up on those with an NPE, and the UserDetails had no usable username.
     */
    @Test
    void accountWithNoEmail_signsInUsingItsPhoneNumber() throws Exception {
        String sub = "google-sub-nomail-" + System.nanoTime();
        String phone = "+91 90000" + (10000 + (int) (System.nanoTime() % 80000));

        User phoneOnly = SupermeUserFixture.user(null);
        phoneOnly.setPhone(phone);
        phoneOnly.setOauth2ProviderId(sub);
        phoneOnly.setOauth2ProviderType("GOOGLE");
        userRepository.save(phoneOnly);

        Jwt jwt = Jwt.withTokenValue("fake-google-token")
                .header("alg", "RS256")
                .claim("iss", "https://accounts.google.com")
                .claim("aud", "some-client-id")
                .claim("sub", sub)
                .claim("email", "unrelated-" + System.nanoTime() + "@example.com")
                .claim("email_verified", true)
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(jwt);

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        HttpResponse<String> resp = googleLogin(http);

        assertThat(resp.statusCode()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("username").asText()).isEqualTo(phone);
        assertThat(body.get("email").isNull()).isTrue();
    }

    @Test
    void deletedAccount_cannotSignInWithGoogle() throws Exception {
        String email = "deleted-google-" + System.nanoTime() + "@example.com";
        User user = SupermeUserFixture.user(email);
        user.setDeleted(true);
        userRepository.save(user);
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        assertThat(googleLogin(http).statusCode()).isEqualTo(401);
    }

    @Test
    void googleLogin_resumesOriginalAuthorizeRequest() throws Exception {
        String email = "resume-" + System.nanoTime() + "@example.com";
        SupermeUserFixture.saveWithoutPassword(userRepository, email);
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        String base = "http://localhost:" + port;

        String verifier = b64url("resume-check-verifier-abcdefghijklmnopqrstuv".getBytes());
        String challenge = sha256(verifier);
        String authorizeQuery = "response_type=code&client_id=" + CLIENT_ID
                + "&redirect_uri=" + REDIRECT_URI
                + "&scope=openid&code_challenge=" + challenge
                + "&code_challenge_method=S256&state=resume-state-1";

        // Step 1: hit /oauth2/authorize unauthenticated - Spring redirects to /login and
        // saves this exact request (same mechanism a password login resumes from).
        HttpRequest authorizeReq = HttpRequest.newBuilder(URI.create(base + "/oauth2/authorize?" + authorizeQuery)).GET().build();
        HttpResponse<String> authorizeResp = http.send(authorizeReq, HttpResponse.BodyHandlers.ofString());
        assertThat(authorizeResp.statusCode()).isEqualTo(302);
        assertThat(authorizeResp.headers().firstValue("Location").orElseThrow()).contains("/login");

        // Step 2: Google sign-in on the SAME session (same cookie jar).
        HttpResponse<String> googleResp = googleLogin(http);
        assertThat(googleResp.statusCode()).isEqualTo(200);

        JsonNode body = objectMapper.readTree(googleResp.body());
        String redirectTo = body.get("redirectTo").asText();

        // Must resume the EXACT original /oauth2/authorize request (same code_challenge
        // the client is waiting on), not a generic SPA URL.
        assertThat(redirectTo).contains("/oauth2/authorize");
        assertThat(redirectTo).contains("state=resume-state-1");
        assertThat(redirectTo).contains("code_challenge=" + challenge);
    }

    /**
     * End-to-end check for a user-reported case: "the registered users admin table shows up after a
     * password login but not after a Google login." Verifies that's a data fact (no Google account
     * happens to be an admin), not a mechanism bug - a Google-authenticated session that DOES carry
     * ROLE_ADMIN must still end up with "ROLE_ADMIN" in the issued access token's roles claim,
     * exactly like a password login would, since AdminApiSecurityConfig's /api/admin/** gate reads
     * only that claim off the Bearer token and doesn't care how the token was obtained.
     */
    @Test
    void existingGoogleAdminUser_issuedTokenCarriesRoleAdmin() throws Exception {
        String email = "google-admin-" + System.nanoTime() + "@example.com";
        SupermeUserFixture.saveWithPassword(userRepository, userPasswordRepository, passwordEncoder,
                email, null, "unused-password", Role.ADMIN);

        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        HttpClient http = HttpClient.newBuilder()
                .cookieHandler(new CookieManager())
                .followRedirects(HttpClient.Redirect.NEVER)
                .build();
        String base = "http://localhost:" + port;

        String verifier = b64url("google-admin-check-verifier-abcdefghijklmno".getBytes());
        String challenge = sha256(verifier);
        String authorizeQuery = "response_type=code&client_id=" + CLIENT_ID
                + "&redirect_uri=" + REDIRECT_URI
                + "&scope=openid&code_challenge=" + challenge
                + "&code_challenge_method=S256&state=admin-check-state";

        // Same sequence the real app follows: hit /oauth2/authorize unauthenticated first
        // (saves the request), then sign in with Google on the same session.
        HttpRequest authorizeReq = HttpRequest.newBuilder(URI.create(base + "/oauth2/authorize?" + authorizeQuery)).GET().build();
        http.send(authorizeReq, HttpResponse.BodyHandlers.ofString());

        HttpResponse<String> googleResp = googleLogin(http);
        JsonNode googleBody = objectMapper.readTree(googleResp.body());
        String redirectTo = googleBody.get("redirectTo").asText();
        assertThat(redirectTo).contains("/oauth2/authorize");

        HttpRequest resumeReq = HttpRequest.newBuilder(URI.create(redirectTo)).GET().build();
        HttpResponse<String> resumeResp = http.send(resumeReq, HttpResponse.BodyHandlers.ofString());
        assertThat(resumeResp.statusCode()).isEqualTo(302);
        String location = resumeResp.headers().firstValue("Location").orElseThrow();
        assertThat(location).startsWith(REDIRECT_URI);
        String code = Arrays.stream(location.substring(location.indexOf('?') + 1).split("&"))
                .map(p -> p.split("=", 2))
                .filter(p -> p[0].equals("code"))
                .map(p -> p[1])
                .findFirst().orElseThrow();

        String form = "grant_type=authorization_code&code=" + code
                + "&redirect_uri=" + URLEncoder.encode(REDIRECT_URI, StandardCharsets.UTF_8)
                + "&client_id=" + CLIENT_ID
                + "&code_verifier=" + verifier;
        HttpRequest tokenReq = HttpRequest.newBuilder(URI.create(base + "/oauth2/token"))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .build();
        HttpResponse<String> tokenResp = http.send(tokenReq, HttpResponse.BodyHandlers.ofString());
        assertThat(tokenResp.statusCode()).isEqualTo(200);
        JsonNode tokens = objectMapper.readTree(tokenResp.body());
        assertThat(tokens.get("user").get("authProvider").asText()).isEqualTo("google");
        assertThat(tokens.get("user").get("socialProviderId").asText()).isEqualTo("google-sub-" + email);
        String accessToken = tokens.get("access_token").asText();

        String[] parts = accessToken.split("\\.");
        String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8);
        JsonNode claims = objectMapper.readTree(payloadJson);
        assertThat(claims.get("authProvider").asText()).isEqualTo("google");
        assertThat(claims.get("socialProviderId").asText()).isEqualTo("google-sub-" + email);
        List<String> roles = objectMapper.convertValue(claims.get("roles"),
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        assertThat(roles).containsExactly("ROLE_ADMIN");
    }
}
