package com.pkce.authserver.security;

import com.pkce.authserver.config.RateLimitProperties;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

// ===================== RATE LIMITING CODE =====================
/**
 * Brute-force / abuse protection on every unauthenticated endpoint worth throttling - the login
 * form and the compat JSON login, the token endpoint, every endpoint that sends a real email, every
 * endpoint that accepts a guess at an issued code, registration, and google-login (real
 * signature-verification work per call, otherwise free to flood). An
 * event fires through SecurityEventService on every 429, so repeated trips show up as an
 * actual record, not just a scattered log line. In-memory, per-process buckets keyed by
 * client IP + endpoint - fine for a single instance; a multi-instance deployment needs a
 * shared store (e.g. bucket4j-redis) instead, see ARCHITECTURE.md limitations.
 */
public class RateLimitFilter extends OncePerRequestFilter {

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final RateLimitProperties properties;
    private final boolean trustForwardedHeader;
    private final SecurityEventService securityEventService;

    public RateLimitFilter(RateLimitProperties properties, SecurityEventService securityEventService) {
        this.properties = properties;
        this.trustForwardedHeader = properties.isTrustForwardedHeader();
        this.securityEventService = securityEventService;
    }

    // ----- RATE LIMITING CODE: per-request check, 429 on bucket exhaustion -----
    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String category = category(request);
        if (category == null) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = clientIp(request);
        Bucket bucket = buckets.computeIfAbsent(category + ":" + ip, key -> newBucket(category));

        if (bucket.tryConsume(1)) {
            filterChain.doFilter(request, response);
        } else {
            securityEventService.record(SecurityEventType.RATE_LIMIT_EXCEEDED, null, ip, category + " " + request.getRequestURI());
            response.setStatus(429);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"too_many_requests\",\"error_description\":\"Rate limit exceeded, try again later\"}");
        }
    }

    // ----- RATE LIMITING CODE: which endpoints are throttled, and under which bucket -----
    /**
     * Matching is on exact suffixes rather than prefixes because the same endpoint is served under
     * more than one base path (this app's own /api/auth/... and the SuperMeBE-compatible
     * /v1/auth/..., see ARCHITECTURE.md section 20). Every entry below is listed explicitly: an
     * endpoint that is merely *similar* to a covered one gets no limit, which is how the compat
     * API's own OTP endpoints were initially left uncovered.
     */
    private String category(HttpServletRequest request) {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return null;
        }
        String path = request.getRequestURI();

        // Password submission - both the BE login form and the compat JSON login.
        if (path.endsWith("/login") || path.endsWith("/session-login")) {
            return "login";
        }
        if (path.endsWith("/oauth2/token")) {
            return "token";
        }
        // Anything that triggers a real outbound email - capped tighter than login/token so none of
        // these can be used to spam an arbitrary inbox or burn the mail quota.
        if (path.endsWith("/forgot-password/request")
                || path.endsWith("/continue-with-email/request")
                || path.endsWith("/register/request-otp")
                || path.endsWith("/send-otp")
                || path.endsWith("/auth/forgot-password")) {
            return "otp-request";
        }
        // Guessing attempts against an already-issued code. Each service caps attempts per code as
        // well; this caps request volume per IP on top of that, which is what keeps a distributed
        // guess at a 4-digit compat code expensive.
        if (path.endsWith("/forgot-password/reset")
                || path.endsWith("/forgot-password/reset-password")
                || path.endsWith("/continue-with-email/verify")
                || path.endsWith("/verify-otp")) {
            return "verify";
        }
        // Account creation: cheap for an attacker to flood, and every call does real work
        // (verification lookup, BCrypt, inserts into a live database).
        if (path.endsWith("/auth/register")) {
            return "verify";
        }
        // No rate limit here meant real signature-verification work ran on every
        // request for free - cheap for an attacker to flood, not cheap for this server.
        if (path.endsWith("/google-login")) {
            return "google-login";
        }
        return null;
    }

    private Bucket newBucket(String category) {
        RateLimitProperties.Limit limit = switch (category) {
            case "login" -> properties.getLogin();
            case "otp-request" -> properties.getOtpRequest();
            case "verify" -> properties.getVerify();
            case "google-login" -> properties.getGoogleLogin();
            default -> properties.getToken();
        };
        Bandwidth bandwidth = Bandwidth.classic(limit.getCapacity(),
                Refill.greedy(limit.getRefillTokens(), Duration.ofSeconds(limit.getRefillDurationSeconds())));
        return Bucket.builder().addLimit(bandwidth).build();
    }

    private String clientIp(HttpServletRequest request) {
        // X-Forwarded-For is client-controlled unless a trusted reverse proxy sits in
        // front of this app and is known to set/overwrite it itself - see
        // RateLimitProperties.trustForwardedHeader. Blindly trusting it here would let an
        // attacker rotate the header value per request and get a fresh bucket every time,
        // defeating the limiter entirely.
        if (trustForwardedHeader) {
            String forwardedFor = request.getHeader("X-Forwarded-For");
            if (forwardedFor != null && !forwardedFor.isBlank()) {
                return forwardedFor.split(",")[0].trim();
            }
        }
        return request.getRemoteAddr();
    }
}
