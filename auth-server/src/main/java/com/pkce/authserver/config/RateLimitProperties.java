package com.pkce.authserver.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

// ===================== RATE LIMITING CODE =====================
// Capacity/refill knobs for RateLimitFilter's buckets, bound from app.rate-limit.* in
// application.yml (see that file's rate-limit: block).
@Getter
@Setter
@ConfigurationProperties(prefix = "app.rate-limit")
public class RateLimitProperties {

    private Limit login = new Limit(10, 10, 60);
    private Limit token = new Limit(30, 30, 60);
    private Limit otpRequest = new Limit(5, 5, 900);
    /** forgot-password/reset and continue-with-email/verify - OtpService caps attempts per code; this caps request volume per IP on top of that. */
    private Limit verify = new Limit(10, 10, 900);
    /** google-login - real signature verification work per call, otherwise free to flood. */
    private Limit googleLogin = new Limit(20, 20, 60);

    /**
     * Off by default: X-Forwarded-For is attacker-controlled on any request that reaches
     * this app directly (no reverse proxy in front of it, true for local dev and unless
     * explicitly deployed otherwise), so trusting it would let an attacker rotate the
     * header value per request and bypass the per-IP limit entirely - defeating the
     * limiter against exactly the abuse it exists for (e.g. email-bombing an arbitrary
     * inbox via the otp-request limit). Only flip this on when this app is genuinely
     * deployed behind a reverse proxy that itself sets/overwrites X-Forwarded-For (never
     * passes through a client-supplied one unchanged).
     */
    private boolean trustForwardedHeader = false;

    @Getter
    @Setter
    public static class Limit {
        private int capacity;
        private int refillTokens;
        private int refillDurationSeconds;

        public Limit() {
        }

        public Limit(int capacity, int refillTokens, int refillDurationSeconds) {
            this.capacity = capacity;
            this.refillTokens = refillTokens;
            this.refillDurationSeconds = refillDurationSeconds;
        }
    }
}
