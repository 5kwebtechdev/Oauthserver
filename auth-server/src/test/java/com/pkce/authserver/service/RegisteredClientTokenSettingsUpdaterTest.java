package com.pkce.authserver.service;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RegisteredClientTokenSettingsUpdaterTest {

    @Test
    void keepsWebsitePolicyAndAppliesAndroidPolicyOnlyToTheDedicatedClient() {
        TokenSettings current = TokenSettings.builder().reuseRefreshTokens(false).build();

        TokenSettings website = RegisteredClientTokenSettingsUpdater.resolveSettings(
                "supermeapp-dev-web", "supermeapp-dev-android", "PT15M", "PT20M", "PT15M", "P7D", current);
        TokenSettings android = RegisteredClientTokenSettingsUpdater.resolveSettings(
                "supermeapp-dev-android", "supermeapp-dev-android", "PT15M", "PT20M", "PT15M", "P7D", current);

        assertThat(website.getAccessTokenTimeToLive()).isEqualTo(Duration.ofMinutes(15));
        assertThat(website.getRefreshTokenTimeToLive()).isEqualTo(Duration.ofMinutes(20));
        assertThat(android.getAccessTokenTimeToLive()).isEqualTo(Duration.ofMinutes(15));
        assertThat(android.getRefreshTokenTimeToLive()).isEqualTo(Duration.ofDays(7));
        assertThat(website.isReuseRefreshTokens()).isFalse();
        assertThat(android.isReuseRefreshTokens()).isFalse();
    }
}
