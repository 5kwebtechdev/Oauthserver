package com.pkce.authserver.service;

/** Fixed, small set of event types actually worth recording - kept deliberately narrow to stay actionable, not noisy. */
public final class SecurityEventType {

    public static final String LOGIN_FAILURE = "LOGIN_FAILURE";
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    public static final String OTP_VERIFY_FAILURE = "OTP_VERIFY_FAILURE";
    public static final String RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED";
    public static final String CAPTCHA_FAILED = "CAPTCHA_FAILED";

    private SecurityEventType() {
    }
}
