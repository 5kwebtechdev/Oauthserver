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

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;

/**
 * Drives the exact call sequence the live SuperMeApp frontend makes against api.supermeapp.com -
 * send-otp, verify-otp, check/alreadyRegistered, register, login - against this server, with the
 * same request bodies, and asserts the responses have the shape that frontend expects.
 *
 * The point is that an existing client can be repointed here without changing a line, so these
 * assertions are deliberately about the wire format, not about internals.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
class SupermeCompatApiTest {

    @LocalServerPort
    private int port;

    @Autowired
    private SupermeUserRepository userRepository;

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

    private HttpResponse<String> get(String path) throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + path))
                .GET().build(), HttpResponse.BodyHandlers.ofString());
    }

    /**
     * Runs send-otp and digs the 4-digit code out of the branded HTML mail it triggers - the same
     * template SuperMeBE sends, so the code arrives inside the markup rather than as plain text.
     */
    private String sendAndCaptureOtp(String email) throws Exception {
        doNothing().when(emailService).sendHtmlMail(anyString(), anyString(), anyString());
        HttpResponse<String> resp = post("/v1/api/auth/send-otp", "{\"email\":\"" + email + "\"}");
        assertThat(resp.statusCode()).isEqualTo(200);

        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("success").asBoolean()).isTrue();
        assertThat(body.get("message").asText()).isEqualTo("OTP sent successfully");
        assertThat(body.get("identifierType").asText()).isEqualTo("EMAIL");
        // The code must never be in the response - only in the inbox.
        assertThat(body.get("otp").isNull()).isTrue();

        org.mockito.ArgumentCaptor<String> captor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlMail(eq(email), eq("Your OTP Verification Code - SuperMe"), captor.capture());
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("monospace;\">(\\d{4})</div>").matcher(captor.getValue());
        assertThat(m.find()).isTrue();
        return m.group(1); // theirs are 4 digits, not 6
    }

    @Test
    void fullFrontendSequence_sendOtp_verifyOtp_check_register_login() throws Exception {
        String email = "compat-" + System.nanoTime() + "@yopmail.com";
        String phone = "+9180785" + (10000 + (int) (System.nanoTime() % 80000));
        String username = "compat" + (System.nanoTime() % 1000000);

        // 1. send-otp
        String otp = sendAndCaptureOtp(email);

        // 2. verify-otp - nextStep 4 is what their frontend advances on
        HttpResponse<String> verified = post("/v1/api/auth/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        assertThat(verified.statusCode()).isEqualTo(200);
        JsonNode verifiedBody = objectMapper.readTree(verified.body());
        assertThat(verifiedBody.get("success").asBoolean()).isTrue();
        assertThat(verifiedBody.get("nextStep").asInt()).isEqualTo(4);

        // 3. check/alreadyRegistered for the username they are about to claim
        HttpResponse<String> check = get("/v1/auth/check/alreadyRegistered?identifier="
                + URLEncoder.encode(username, StandardCharsets.UTF_8));
        assertThat(check.statusCode()).isEqualTo(200);
        JsonNode checkBody = objectMapper.readTree(check.body());
        assertThat(checkBody.get("status").asBoolean()).isFalse();
        assertThat(checkBody.get("message").asText()).isEqualTo("User not found!");
        assertThat(checkBody.get("identifier").asText()).isEqualTo(username);

        // 4. register - the real payload their frontend sends, verbatim in shape
        String registerBody = """
                {"name":"tempwew","username":"%s","gender":"male","relationship":"SELF",
                 "password":"password@123","avatarName":"18-plus-male-5",
                 "avatarImageName":"18-plus-male-5.webp","referralCode":null,
                 "unlockPotential":false,"email":"%s","phone":"%s","dateOfBirth":"1996-10-06"}
                """.formatted(username, email, phone);
        HttpResponse<String> registered = post("/v1/auth/register", registerBody);
        assertThat(registered.statusCode()).isEqualTo(201);

        JsonNode user = objectMapper.readTree(registered.body());
        assertThat(user.get("id").asLong()).isPositive();
        assertThat(user.get("name").asText()).isEqualTo("tempwew");
        assertThat(user.get("username").asText()).isEqualTo(username);
        assertThat(user.get("email").asText()).isEqualTo(email);
        assertThat(user.get("phone").asText()).isEqualTo(phone);
        assertThat(user.get("role").asText()).isEqualTo("USER");
        assertThat(user.get("relationship").asText()).isEqualTo("SELF");
        assertThat(user.get("onboardingStep").asInt()).isEqualTo(5);
        assertThat(user.get("gender").asText()).isEqualTo("male");
        assertThat(user.get("dateOfBirth").asText()).isEqualTo("1996-10-06");
        assertThat(user.get("ageGroup").asText()).isEqualTo("AGE_18_PLUS");
        assertThat(user.get("coins").asInt()).isEqualTo(10);
        // The requested avatarName is ignored and a unique one generated, exactly as theirs does;
        // the image name is kept.
        assertThat(user.get("avatarName").asText()).isNotEqualTo("18-plus-male-5");
        assertThat(user.get("avatarImageName").asText()).isEqualTo("18-plus-male-5.webp");
        // Fields their mapper never copies, so they read as false/null however the row looks.
        assertThat(user.get("loggedIn").asBoolean()).isFalse();
        assertThat(user.get("enabled").asBoolean()).isFalse();
        assertThat(user.get("lastLoginDate").isNull()).isTrue();
        assertThat(user.get("petName").isNull()).isTrue();
        assertThat(user.get("familyCode").isNull()).isTrue();

        // 5. the same identifier now reports as taken
        HttpResponse<String> recheck = get("/v1/auth/check/alreadyRegistered?identifier="
                + URLEncoder.encode(email, StandardCharsets.UTF_8));
        assertThat(objectMapper.readTree(recheck.body()).get("status").asBoolean()).isTrue();

        // 6. login with the password just registered
        HttpResponse<String> login = post("/v1/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"password@123\"}");
        assertThat(login.statusCode()).isEqualTo(200);
        JsonNode loginBody = objectMapper.readTree(login.body());
        assertThat(loginBody.get("token").asText()).isNotBlank();
        assertThat(loginBody.get("firstLoggedForTheDay").asBoolean()).isFalse();
        // Their login payload is the nested UserDTO, not the flat register one.
        JsonNode loginUser = loginBody.get("user");
        assertThat(loginUser.get("email").asText()).isEqualTo(email);
        assertThat(loginUser.get("name").asText()).isEqualTo("tempwew");
        assertThat(loginUser.get("age").asInt()).isPositive();
        assertThat(loginUser.has("familyMembers")).isTrue();

        // The token is this server's own RS256 access token, not a bespoke one.
        assertThat(loginBody.get("token").asText().split("\\.")).hasSize(3);
    }

    @Test
    void loginByPhone_works_likeTheirs() throws Exception {
        String email = "compat-phone-" + System.nanoTime() + "@yopmail.com";
        String phone = "+9190000" + (10000 + (int) (System.nanoTime() % 80000));
        String otp = sendAndCaptureOtp(email);
        post("/v1/api/auth/verify-otp", "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        post("/v1/auth/register", """
                {"name":"Phone Person","gender":"female","relationship":"SELF","password":"password@123",
                 "email":"%s","phone":"%s","dateOfBirth":"1996-10-06"}
                """.formatted(email, phone));

        HttpResponse<String> login = post("/v1/auth/login",
                "{\"phone\":\"" + phone + "\",\"password\":\"password@123\"}");
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(objectMapper.readTree(login.body()).get("token").asText()).isNotBlank();
    }

    @Test
    void sendOtp_forAnAddressThatAlreadyHasAnAccount_isRefused() throws Exception {
        String email = "compat-taken-" + System.nanoTime() + "@yopmail.com";
        userRepository.save(SupermeUserFixture.user(email));

        HttpResponse<String> resp = post("/v1/api/auth/send-otp", "{\"email\":\"" + email + "\"}");
        assertThat(resp.statusCode()).isEqualTo(400);
        JsonNode body = objectMapper.readTree(resp.body());
        assertThat(body.get("success").asBoolean()).isFalse();
        assertThat(body.get("message").asText()).isEqualTo("Account already exists with this email.");
        org.mockito.Mockito.verifyNoInteractions(emailService);
    }

    @Test
    void verifyOtp_rejectsAWrongOrExpiredCode() throws Exception {
        String email = "compat-wrong-" + System.nanoTime() + "@yopmail.com";
        sendAndCaptureOtp(email);

        HttpResponse<String> wrong = post("/v1/api/auth/verify-otp",
                "{\"email\":\"" + email + "\",\"otp\":\"0000\"}");
        assertThat(wrong.statusCode()).isEqualTo(400);
        assertThat(objectMapper.readTree(wrong.body()).get("message").asText())
                .isEqualTo("Invalid OTP. Please check and try again.");

        // Never requested at all.
        HttpResponse<String> unknown = post("/v1/api/auth/verify-otp",
                "{\"email\":\"never-asked-" + System.nanoTime() + "@yopmail.com\",\"otp\":\"1234\"}");
        assertThat(objectMapper.readTree(unknown.body()).get("message").asText())
                .isEqualTo("No OTP found for this email. Please request a new OTP.");
    }

    /**
     * Theirs trusts that verify-otp ran first because nothing else could reach it. This server is
     * reachable directly, so registering without a recent verification is refused rather than
     * leaving an open account-creation endpoint.
     */
    @Test
    void register_withoutVerifyingTheEmailFirst_isRefused() throws Exception {
        String email = "compat-unverified-" + System.nanoTime() + "@yopmail.com";

        HttpResponse<String> resp = post("/v1/auth/register", """
                {"name":"No Verify","gender":"male","relationship":"SELF","password":"password@123",
                 "email":"%s","dateOfBirth":"1996-10-06"}
                """.formatted(email));

        assertThat(resp.statusCode()).isEqualTo(401);
        assertThat(userRepository.findByEmail(email)).isEmpty();
    }

    @Test
    void login_mirrorsTheirFailureCases() throws Exception {
        HttpResponse<String> unknown = post("/v1/auth/login",
                "{\"email\":\"nobody-" + System.nanoTime() + "@yopmail.com\",\"password\":\"whatever\"}");
        assertThat(unknown.statusCode()).isEqualTo(404);
        assertThat(objectMapper.readTree(unknown.body()).get("message").asText()).isEqualTo("User not found.");

        String email = "compat-badpass-" + System.nanoTime() + "@yopmail.com";
        String otp = sendAndCaptureOtp(email);
        post("/v1/api/auth/verify-otp", "{\"email\":\"" + email + "\",\"otp\":\"" + otp + "\"}");
        post("/v1/auth/register", """
                {"name":"Pass Person","gender":"male","relationship":"SELF","password":"password@123",
                 "email":"%s","dateOfBirth":"1996-10-06"}
                """.formatted(email));

        HttpResponse<String> wrongPassword = post("/v1/auth/login",
                "{\"email\":\"" + email + "\",\"password\":\"not-the-password\"}");
        assertThat(wrongPassword.statusCode()).isEqualTo(401);
        assertThat(objectMapper.readTree(wrongPassword.body()).get("message").asText())
                .isEqualTo("Incorrect password.");

        HttpResponse<String> noPassword = post("/v1/auth/login", "{\"email\":\"" + email + "\",\"password\":\"\"}");
        assertThat(noPassword.statusCode()).isEqualTo(400);
    }
}
