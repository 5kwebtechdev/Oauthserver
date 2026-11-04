package com.pkce.authserver.web;

import com.pkce.authserver.service.AndroidDevGoogleHandoffStore;
import com.pkce.authserver.service.TurnstileVerificationService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Optional;

/** Hosted Cloudflare check for Android DEV native Google sign-in; unrelated to website login. */
@RestController
@RequiredArgsConstructor
public class AndroidDevGoogleTurnstileController {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final long TRANSACTION_TTL_SECONDS = 300;
    private static final long TICKET_TTL_SECONDS = 300;

    private final AndroidDevGoogleHandoffStore handoffs;
    private final RegisteredClientRepository clients;
    private final TurnstileVerificationService turnstile;

    @Value("${app.security.android-dev-client.id:}")
    private String androidClientId;
    @Value("${app.turnstile.site-key:}")
    private String turnstileSiteKey;
    @Value("${app.security.issuer}")
    private String issuer;

    /** Starts the browser-hosted check. Initiation data stays in the HTTPS request body. */
    @PostMapping("/v1/auth/android-dev/google/turnstile")
    public ResponseEntity<Map<String, Object>> initiate(@Valid @RequestBody InitiateRequest request) {
        if (!StringUtils.hasText(androidClientId) || !androidClientId.equals(request.clientId())) {
            return error(HttpStatus.BAD_REQUEST, "invalid_client", "Android DEV client is not available.");
        }
        RegisteredClient client = clients.findByClientId(androidClientId);
        if (client == null || !client.getRedirectUris().contains(request.redirectUri())) {
            return error(HttpStatus.BAD_REQUEST, "invalid_redirect_uri",
                    "The redirect URI is not registered for this Android client.");
        }
        if (!"S256".equals(request.codeChallengeMethod())
                || !request.codeChallenge().matches("^[A-Za-z0-9_-]{43}$")) {
            return error(HttpStatus.BAD_REQUEST, "invalid_pkce", "A valid S256 code challenge is required.");
        }
        if (!StringUtils.hasText(turnstileSiteKey) || !turnstile.isConfigured()) {
            return error(HttpStatus.SERVICE_UNAVAILABLE, "bot_protection_unavailable",
                    "Android sign-in security check is temporarily unavailable.");
        }

        String transaction = randomValue();
        handoffs.createTransaction(transaction, new AndroidDevGoogleHandoffStore.LoginAttempt(
                androidClientId, request.redirectUri(), request.codeChallenge(), request.googleNonce(),
                request.oidcNonce(), request.state()), Instant.now().plusSeconds(TRANSACTION_TTL_SECONDS));
        String securityCheckUrl = UriComponentsBuilder.fromUriString(issuer)
                .path("/android-dev/google-security")
                .queryParam("transaction", transaction).build().encode().toUriString();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .body(Map.of("transactionId", transaction, "securityCheckUrl", securityCheckUrl,
                        "expires_in", TRANSACTION_TTL_SECONDS));
    }

    /** The Custom Tab opens this auth-hosted page; the widget remains on auth.supermeapp.com. */
    @GetMapping(value = "/android-dev/google-security", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> securityPage(@RequestParam String transaction, HttpServletRequest request) {
        if (handoffs.findTransaction(transaction).isEmpty()) {
            return html(HttpStatus.GONE, simplePage("Security check expired", "Start Google sign-in again."));
        }
        if (!turnstile.isConfigured() || !StringUtils.hasText(turnstileSiteKey)) {
            return html(HttpStatus.SERVICE_UNAVAILABLE,
                    simplePage("Security check unavailable", "Please try again later."));
        }
        CsrfToken csrf = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return html(HttpStatus.OK, renderSecurityPage(transaction, csrf == null ? null : csrf.getParameterName(),
                csrf == null ? null : csrf.getToken(), null));
    }

    /** Cloudflare posts its response to this same-origin endpoint; the CAPTCHA token is never redirected. */
    @PostMapping(value = "/android-dev/google-security/complete", consumes = "application/x-www-form-urlencoded")
    public ResponseEntity<String> completeHostedCheck(@RequestParam String transaction,
            @RequestParam(name = "cf-turnstile-response", required = false) String captcha,
            HttpServletRequest request) {
        Optional<AndroidDevGoogleHandoffStore.LoginAttempt> attempt = handoffs.findTransaction(transaction);
        if (attempt.isEmpty()) {
            return html(HttpStatus.GONE, simplePage("Security check expired", "Start Google sign-in again."));
        }
        if (!turnstile.verify(captcha, request.getRemoteAddr())) {
            CsrfToken csrf = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
            return html(HttpStatus.UNAUTHORIZED, renderSecurityPage(transaction,
                    csrf == null ? null : csrf.getParameterName(), csrf == null ? null : csrf.getToken(),
                    "The check was not accepted. Complete it again to continue."));
        }

        String ticket = randomValue();
        Optional<AndroidDevGoogleHandoffStore.LoginAttempt> issued = handoffs.issueTicket(
                transaction, ticket, Instant.now().plusSeconds(TICKET_TTL_SECONDS));
        if (issued.isEmpty()) {
            return html(HttpStatus.GONE, simplePage("Security check expired", "Start Google sign-in again."));
        }
        URI callback = UriComponentsBuilder.fromUriString(issued.get().redirectUri())
                .queryParam("android_google_ticket", ticket)
                .queryParam("state", issued.get().state()).build().encode().toUri();
        return ResponseEntity.status(HttpStatus.FOUND).location(callback)
                .cacheControl(CacheControl.noStore()).header("Pragma", "no-cache").build();
    }

    @PostMapping("/v1/auth/android-dev/google/turnstile/cancel")
    public ResponseEntity<Map<String, Object>> cancel(@Valid @RequestBody CancelRequest request) {
        boolean cancelled = handoffs.cancelTransaction(request.transactionId());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore())
                .body(Map.of("cancelled", cancelled));
    }

    private String renderSecurityPage(String transaction, String csrfName, String csrfToken, String error) {
        String csrfField = csrfName == null || csrfToken == null ? ""
                : "<input type=\"hidden\" name=\"" + escape(csrfName) + "\" value=\"" + escape(csrfToken) + "\">";
        String errorBlock = error == null ? "" : "<p role=\"alert\" style=\"color:#b42318\">" + escape(error) + "</p>";
        return """
                <!doctype html><html lang="en"><head><meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <meta name="referrer" content="no-referrer"><title>Security check | SuperMe</title>
                <style>body{font:16px system-ui,sans-serif;max-width:32rem;margin:12vh auto;padding:1.5rem;color:#26213a}
                h1{color:#482779}button{margin-top:1rem;padding:.7rem 1.3rem;border:0;border-radius:.5rem;background:#482779;color:white}</style>
                <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
                </head><body><h1>Security check</h1><p>Complete the check to continue with Google.</p>
                %s<form id="check" method="post" action="/android-dev/google-security/complete">
                %s<input type="hidden" name="transaction" value="%s">
                <div class="cf-turnstile" data-sitekey="%s" data-action="android_google"
                     data-callback="turnstileComplete" data-expired-callback="turnstileExpired"></div>
                <button id="continue" type="submit" disabled>Continue</button></form>
                <script>function turnstileComplete(token){document.getElementById('continue').disabled=false;
                document.getElementById('check').requestSubmit();}
                function turnstileExpired(){document.getElementById('continue').disabled=true;}</script>
                </body></html>
                """.formatted(errorBlock, csrfField, escape(transaction), escape(turnstileSiteKey));
    }

    private static String simplePage(String title, String message) {
        return "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>"
                + escape(title) + "</title><h1>" + escape(title) + "</h1><p>" + escape(message) + "</p></html>";
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("\"", "&quot;")
                .replace("<", "&lt;").replace(">", "&gt;").replace("'", "&#39;");
    }

    private static String randomValue() {
        byte[] bytes = new byte[32]; RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static ResponseEntity<Map<String, Object>> error(HttpStatus status, String error, String description) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .body(Map.of("error", error, "error_description", description));
    }

    private static ResponseEntity<String> html(HttpStatus status, String html) {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).header("Pragma", "no-cache")
                .contentType(MediaType.TEXT_HTML)
                .header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; script-src https://challenges.cloudflare.com 'unsafe-inline'; connect-src https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; worker-src blob:; img-src data: https://challenges.cloudflare.com; form-action 'self'; base-uri 'none'; frame-ancestors 'none'")
                .header("X-Content-Type-Options", "nosniff").body(html);
    }

    public record InitiateRequest(@NotBlank String clientId, @NotBlank String redirectUri,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String codeChallenge,
            @NotBlank String codeChallengeMethod,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String googleNonce,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String oidcNonce,
            @NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{22,128}$") String state) { }
    public record CancelRequest(@NotBlank @Pattern(regexp = "^[A-Za-z0-9_-]{43}$") String transactionId) { }
}
