package com.pkce.authserver.service;

import com.pkce.authserver.config.TurnstileProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Verifies a Cloudflare Turnstile token server-side (the client-side widget alone proves
 * nothing - a bot can just skip rendering it and omit the token, or replay an old one,
 * unless the backend actually checks with Cloudflare). Fails CLOSED (rejects) on a token
 * that doesn't verify or a verification call that errors out, but fails OPEN (skips
 * enforcement) when no secret key is configured at all - this project ships without one,
 * so this app stays usable out of the box; see ARCHITECTURE.md for how to get a free key
 * and turn real enforcement on.
 */
@Service
@Slf4j
public class TurnstileVerificationService {

    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final TurnstileProperties properties;
    private final RestClient restClient;
    private volatile boolean warnedNotConfigured = false;

    public TurnstileVerificationService(TurnstileProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public boolean verify(String token, String remoteIp) {
        if (!StringUtils.hasText(properties.getSecretKey())) {
            if (!warnedNotConfigured) {
                log.warn("Turnstile is not configured (app.turnstile.secret-key / TURNSTILE_SECRET_KEY is empty) "
                        + "- captcha verification is DISABLED on all forms. See ARCHITECTURE.md for how to enable it.");
                warnedNotConfigured = true;
            }
            return true;
        }

        if (!StringUtils.hasText(token)) {
            return false;
        }

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", properties.getSecretKey());
        form.add("response", token);
        if (StringUtils.hasText(remoteIp)) {
            form.add("remoteip", remoteIp);
        }

        try {
            TurnstileResponse result = restClient.post()
                    .uri(VERIFY_URL)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(TurnstileResponse.class);
            return result != null && result.success();
        } catch (RestClientException e) {
            log.error("Turnstile verification call failed: {}", e.getMessage());
            return false;
        }
    }

    private record TurnstileResponse(boolean success) {
    }
}
