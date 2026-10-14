package com.pkce.authserver.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * siteKey is public (safe to embed in the FE, like the Google Client ID). secretKey is
 * not - it comes from TURNSTILE_SECRET_KEY with no literal fallback, same reasoning as
 * MAIL_PASSWORD. Both default to empty, which TurnstileVerificationService treats as
 * "not configured yet" rather than a hard failure - see its Javadoc.
 */
@Getter
@Setter
@ConfigurationProperties(prefix = "app.turnstile")
public class TurnstileProperties {

    private String siteKey = "";
    private String secretKey = "";
}
