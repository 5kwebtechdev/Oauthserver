package com.pkce.authserver.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.account-lockout")
public class AccountLockoutProperties {

    private int maxAttempts = 5;
    private int lockoutDurationMinutes = 15;
}
