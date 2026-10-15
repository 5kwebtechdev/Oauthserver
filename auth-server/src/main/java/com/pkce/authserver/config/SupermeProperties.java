package com.pkce.authserver.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Controls whether this server is allowed to modify SuperMeBE's live tables.
 *
 * It shares mindfullP1 with a running production application, so every write here lands in data
 * real users depend on, and SuperMeBE manages the same rows with ddl-auto=update and its own login
 * flow. Defaulting to false means a fresh deployment reads and authenticates without touching
 * anything; flip it on deliberately, once a login has been verified end to end.
 *
 * Writes behind this flag: linking Google provider ids onto an existing account
 * (GoogleLoginService), Google registration and onboarding (UserRegistrationService), and
 * password resets (ForgotPasswordService). Our own tables -
 * auth_login_attempt, otp_code, security_event, the oauth2_* set - are never gated by it.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.superme")
public class SupermeProperties {

    private boolean writesEnabled = false;
}
