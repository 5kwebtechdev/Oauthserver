package com.pkce.authserver;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.service.EmailService;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;

import java.net.CookieManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Registration creates a real SuperMeBE-shaped account and answers with tokens, by either of the
 * two routes a new user can arrive through: an emailed one-time code, or Google sign-in finding no
 * account yet. Ported from their UserService.registerUser - see UserRegistrationService for what is
 * and isn't carried over.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class RegistrationFlowTest {

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

    @MockBean
    private JwtDecoder googleIdTokenDecoder;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private HttpResponse<String> postJson(HttpClient http, String path, String json) throws Exception {
        HttpRequest req = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .POST(HttpRequest.BodyPublishers.ofString(json))
                .header("Content-Type", "application/json")
                .build();
        return http.send(req, HttpResponse.BodyHandlers.ofString());
    }

    private Jwt googleJwt(String email) {
        return Jwt.withTokenValue("fake-google-token")
                .header("alg", "RS256")
                .claim("iss", "https://accounts.google.com")
                .claim("aud", "some-client-id")
                .claim("sub", "google-sub-" + email)
                .claim("email", email)
                .claim("email_verified", true)
                .claim("name", "Google Person")
                .claim("picture", "https://example.com/pic.jpg")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }

    private void assertLooksLikeTokenResponse(JsonNode body) {
        assertThat(body.get("access_token").asText()).isNotBlank();
        assertThat(body.get("token_type").asText()).isEqualTo("Bearer");
        assertThat(body.get("expires_in").asLong()).isPositive();
        assertThat(body.get("refresh_token").asText()).isNotBlank();
        // openid is deliberately absent here: see TokenIssuanceService for why granting it would
        // break the refresh grant on a registration-issued authorization.
        assertThat(body.get("scope").asText()).contains("notes.read");
        assertThat(body.get("scope").asText()).doesNotContain("openid");
        // Same "user" object /oauth2/token carries, in SuperMeBE's UserDTO shape.
        assertThat(body.get("user")).isNotNull();
    }

    @Test
    void otpRegistration_createsSuperMeBeShapedAccount_andReturnsTokens() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-otp-" + System.nanoTime() + "@example.com";

        String otp = registrationOtpFor(email);

        String body = """
                {"name":"Otp Person","email":"%s","password":"TestPassword123!",
                 "gender":"female","dateOfBirth":"1995-04-12","relationship":"SELF",
                 "otp":"%s"}
                """.formatted(email, otp);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(201);
        JsonNode json = objectMapper.readTree(resp.body());
        assertLooksLikeTokenResponse(json);

        User saved = userRepository.findByEmail(email).orElseThrow();
        assertThat(saved.getName()).isEqualTo("Otp Person");
        assertThat(saved.getGender()).isEqualTo("female");
        assertThat(saved.getRelationship()).isEqualTo(Relationship.SELF);
        assertThat(saved.isEmailVerified()).isTrue();
        // Their arithmetic: no pet -> step 5, and the 10-coin signup bonus.
        assertThat(saved.getOnboardingStep()).isEqualTo(5);
        assertThat(saved.getCoins()).isEqualTo(10);
        assertThat(saved.getLifetimeCoinsEarned()).isEqualTo(10);
        // Avatar is auto-created, same as their registration does.
        assertThat(saved.getAvatar()).isNotNull();
        assertThat(saved.getAvatar().getAvatarName()).isNotBlank();
        // Password went into the separate UserPassword table, BCrypt-encoded.
        assertThat(passwordEncoder.matches("TestPassword123!",
                userPasswordRepository.findByUser(saved).orElseThrow().getPassword())).isTrue();

        // The issued access token is a real one: our own JWT, carrying this user's role.
        String[] parts = json.get("access_token").asText().split("\\.");
        JsonNode claims = objectMapper.readTree(new String(Base64.getUrlDecoder().decode(parts[1]), StandardCharsets.UTF_8));
        assertThat(claims.get("sub").asText()).isEqualTo(email);
        List<String> roles = objectMapper.convertValue(claims.get("roles"),
                objectMapper.getTypeFactory().constructCollectionType(List.class, String.class));
        assertThat(roles).containsExactly("ROLE_USER");
    }

    @Autowired
    private com.pkce.authserver.service.OtpService otpService;

    /**
     * The one-time code for a brand-new address. /continue-with-email/request only emails a code to
     * an address that already has an account, so a registration code is issued through the same
     * service the controller uses rather than over HTTP.
     */
    private String registrationOtpFor(String email) {
        return otpService.issue("CONTINUE_WITH_EMAIL", email);
    }

    @Test
    void googleRegistration_whenNoAccountExists_returnsRegistrationRequired_thenRegisters() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-google-" + System.nanoTime() + "@example.com";
        when(googleIdTokenDecoder.decode(anyString())).thenReturn(googleJwt(email));

        // Step 1: Google sign-in finds no account, and says so in a way the caller can act on -
        // handing back the identity the token proved, to pre-fill the registration form.
        HttpResponse<String> loginResp = postJson(http, "/api/auth/google-login",
                "{\"idToken\":\"fake-google-token\"}");
        assertThat(loginResp.statusCode()).isEqualTo(404);
        JsonNode loginBody = objectMapper.readTree(loginResp.body());
        assertThat(loginBody.get("registrationRequired").asBoolean()).isTrue();
        assertThat(loginBody.get("email").asText()).isEqualTo(email);
        assertThat(loginBody.get("name").asText()).isEqualTo("Google Person");

        // Step 2: the same token is the proof of ownership for registration.
        String body = """
                {"name":"Google Person","email":"%s","gender":"male","dateOfBirth":"1990-01-02",
                 "relationship":"PARENT","familyName":"Google Family","petName":"Rocky",
                 "googleIdToken":"fake-google-token"}
                """.formatted(email);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(201);
        assertLooksLikeTokenResponse(objectMapper.readTree(resp.body()));

        User saved = userRepository.findByEmail(email).orElseThrow();
        assertThat(saved.getRelationship()).isEqualTo(Relationship.PARENT);
        // A PARENT with a familyName and no code gets a fresh family with a generated 8-char code.
        assertThat(saved.getFamily()).isNotNull();
        assertThat(saved.getFamily().getFamilyName()).isEqualTo("Google Family");
        assertThat(saved.getFamily().getFamilyCode()).hasSize(8);
        assertThat(saved.getFamily().getCreatedBy()).isEqualTo(saved.getId());
        // Parent starter coins, and a pet pushes the onboarding step to 6.
        assertThat(saved.getCoins()).isEqualTo(500);
        assertThat(saved.getOnboardingStep()).isEqualTo(6);
        assertThat(saved.getPet()).isNotNull();

        // Google sign-in now works for this account.
        HttpResponse<String> secondLogin = postJson(http, "/api/auth/google-login",
                "{\"idToken\":\"fake-google-token\"}");
        assertThat(secondLogin.statusCode()).isEqualTo(200);
    }

    /**
     * The point of minting these through the authorization server's own generator and persisting
     * the OAuth2Authorization: the refresh token is a real one, usable at /oauth2/token with the
     * normal rotation, rather than a parallel token system that only this endpoint understands.
     */
    @Test
    void refreshTokenFromRegistration_worksAtTheTokenEndpoint() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-refresh-" + System.nanoTime() + "@example.com";
        String otp = registrationOtpFor(email);

        HttpResponse<String> registered = postJson(http, "/api/auth/register", """
                {"name":"Refresh Person","email":"%s","gender":"male","dateOfBirth":"1992-06-06",
                 "relationship":"SELF","otp":"%s"}
                """.formatted(email, otp));
        assertThat(registered.statusCode()).isEqualTo(201);
        String refreshToken = objectMapper.readTree(registered.body()).get("refresh_token").asText();

        String form = "grant_type=refresh_token&refresh_token=" + refreshToken
                + "&client_id=pkce-angular-client";
        HttpRequest tokenReq = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/oauth2/token"))
                .POST(HttpRequest.BodyPublishers.ofString(form))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .build();
        HttpResponse<String> refreshed = http.send(tokenReq, HttpResponse.BodyHandlers.ofString());

        assertThat(refreshed.statusCode()).isEqualTo(200);
        JsonNode body = objectMapper.readTree(refreshed.body());
        assertThat(body.get("access_token").asText()).isNotBlank();
        // Rotation is on, so the refresh token comes back changed.
        assertThat(body.get("refresh_token").asText()).isNotEqualTo(refreshToken);
        // And the token endpoint's own "user" payload resolves this user too.
        assertThat(body.get("user").get("email").asText()).isEqualTo(email);
    }

    @Test
    void requestOtp_emailsACodeForANewAddress_andDeclinesForAnExistingOne() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String newEmail = "reg-req-" + System.nanoTime() + "@example.com";
        doNothing().when(emailService).sendOtpEmail(anyString(), anyString());

        HttpResponse<String> fresh = postJson(http, "/api/auth/register/request-otp",
                "{\"email\":\"" + newEmail + "\"}");
        assertThat(fresh.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(fresh.body()).get("alreadyRegistered").asBoolean()).isFalse();
        verify(emailService).sendOtpEmail(eq(newEmail), anyString());

        // An address that already has an account is told to sign in, and gets no code - sending one
        // would let anyone trigger mail to an arbitrary registered user.
        String takenEmail = "reg-taken-" + System.nanoTime() + "@example.com";
        userRepository.save(SupermeUserFixture.user(takenEmail));
        org.mockito.Mockito.reset(emailService);

        HttpResponse<String> taken = postJson(http, "/api/auth/register/request-otp",
                "{\"email\":\"" + takenEmail + "\"}");
        assertThat(taken.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(taken.body()).get("alreadyRegistered").asBoolean()).isTrue();
        org.mockito.Mockito.verifyNoInteractions(emailService);
    }

    @Test
    void registration_withoutProofOfTheEmail_isRejected() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-noproof-" + System.nanoTime() + "@example.com";

        String body = """
                {"name":"No Proof","email":"%s","gender":"male","dateOfBirth":"1990-01-02",
                 "relationship":"SELF"}
                """.formatted(email);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(401);
        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void registration_withAGoogleTokenForADifferentEmail_isRejected() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        when(googleIdTokenDecoder.decode(anyString()))
                .thenReturn(googleJwt("someone-else-" + System.nanoTime() + "@example.com"));

        String victim = "reg-victim-" + System.nanoTime() + "@example.com";
        String body = """
                {"name":"Impostor","email":"%s","gender":"male","dateOfBirth":"1990-01-02",
                 "relationship":"SELF","googleIdToken":"fake-google-token"}
                """.formatted(victim);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(401);
        assertThat(userRepository.findByEmail(victim)).isEmpty();
    }

    @Test
    void registration_rejectsTheSameInvalidInputTheirsDoes() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-invalid-" + System.nanoTime() + "@example.com";
        String otp = registrationOtpFor(email);

        // CHILD without a family code - their rule, reproduced here.
        String body = """
                {"name":"Child Person","email":"%s","gender":"male","dateOfBirth":"2015-01-02",
                 "relationship":"CHILD","otp":"%s"}
                """.formatted(email, otp);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(400);
        assertThat(resp.body()).contains("Family code is mandatory for child registration.");
        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void registeringAnAddressThatAlreadyHasACompleteAccount_isRejected() throws Exception {
        HttpClient http = HttpClient.newBuilder().cookieHandler(new CookieManager()).build();
        String email = "reg-dup-" + System.nanoTime() + "@example.com";

        User existing = SupermeUserFixture.user(email);
        existing.setOnboardingStep(7); // fully onboarded
        userRepository.save(existing);

        String otp = registrationOtpFor(email);
        String body = """
                {"name":"Duplicate","email":"%s","gender":"male","dateOfBirth":"1990-01-02",
                 "relationship":"SELF","otp":"%s"}
                """.formatted(email, otp);
        HttpResponse<String> resp = postJson(http, "/api/auth/register", body);

        assertThat(resp.statusCode()).isEqualTo(400);
        assertThat(resp.body()).contains("User already exists with the provided email or phone.");
    }
}
