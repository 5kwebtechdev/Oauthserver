package com.pkce.authserver.service;

import com.pkce.authserver.config.TurnstileProperties;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * Pure unit test - MockRestServiceServer intercepts the outbound call this service makes
 * to Cloudflare, so none of this hits the real network (and doesn't need a real Turnstile
 * key either).
 */
class TurnstileVerificationServiceTest {

    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    @Test
    void notConfigured_skipsEnforcement_regardlessOfToken() {
        TurnstileProperties properties = new TurnstileProperties(); // secretKey left blank
        TurnstileVerificationService service = new TurnstileVerificationService(properties, RestClient.builder());

        assertThat(service.verify(null, "1.2.3.4")).isTrue();
        assertThat(service.verify("", "1.2.3.4")).isTrue();
        assertThat(service.verify("anything", "1.2.3.4")).isTrue();
    }

    @Test
    void configured_blankToken_failsWithoutCallingCloudflare() {
        TurnstileProperties properties = new TurnstileProperties();
        properties.setSecretKey("test-secret");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        // No .expect(...) registered - any actual HTTP call here would fail the test.

        TurnstileVerificationService service = new TurnstileVerificationService(properties, builder);
        assertThat(service.verify(null, "1.2.3.4")).isFalse();
        assertThat(service.verify("", "1.2.3.4")).isFalse();
        server.verify();
    }

    @Test
    void configured_cloudflareApproves_returnsTrue() {
        TurnstileProperties properties = new TurnstileProperties();
        properties.setSecretKey("test-secret");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(VERIFY_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("{\"success\":true}", MediaType.APPLICATION_JSON));

        TurnstileVerificationService service = new TurnstileVerificationService(properties, builder);
        assertThat(service.verify("valid-token", "1.2.3.4")).isTrue();
        server.verify();
    }

    @Test
    void configured_cloudflareRejects_returnsFalse() {
        TurnstileProperties properties = new TurnstileProperties();
        properties.setSecretKey("test-secret");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(VERIFY_URL))
                .andRespond(withSuccess("{\"success\":false,\"error-codes\":[\"invalid-input-response\"]}", MediaType.APPLICATION_JSON));

        TurnstileVerificationService service = new TurnstileVerificationService(properties, builder);
        assertThat(service.verify("bad-token", "1.2.3.4")).isFalse();
        server.verify();
    }

    @Test
    void configured_verificationCallErrors_failsClosed() {
        TurnstileProperties properties = new TurnstileProperties();
        properties.setSecretKey("test-secret");
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(VERIFY_URL)).andRespond(withServerError());

        TurnstileVerificationService service = new TurnstileVerificationService(properties, builder);
        assertThat(service.verify("some-token", "1.2.3.4")).isFalse();
        server.verify();
    }
}
