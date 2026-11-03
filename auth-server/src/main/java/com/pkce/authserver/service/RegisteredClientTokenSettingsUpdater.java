package com.pkce.authserver.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

/** Applies the configured access and refresh lifetimes to every persisted OAuth client. */
@Component
@RequiredArgsConstructor
@Slf4j
public class RegisteredClientTokenSettingsUpdater implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;
    private final RegisteredClientRepository registeredClientRepository;

    @Value("${app.security.token.access-token-ttl:PT15M}")
    private String accessTokenTtl;

    @Value("${app.security.token.refresh-token-ttl:PT25M}")
    private String refreshTokenTtl;

    @Value("${app.security.android-dev-client.id:}")
    private String androidDevClientId;

    @Value("${app.security.android-dev-client.access-token-ttl:PT15M}")
    private String androidDevAccessTokenTtl;

    @Value("${app.security.android-dev-client.refresh-token-ttl:P7D}")
    private String androidDevRefreshTokenTtl;

    @Override
    public void run(ApplicationArguments args) {
        List<String> ids = jdbcTemplate.queryForList(
                "SELECT id FROM oauth2_registered_client", String.class);
        for (String id : ids) {
            RegisteredClient client = registeredClientRepository.findById(id);
            if (client == null) {
                continue;
            }
            TokenSettings current = client.getTokenSettings();
            TokenSettings updated = resolveSettings(client.getClientId(), androidDevClientId,
                    accessTokenTtl, refreshTokenTtl, androidDevAccessTokenTtl, androidDevRefreshTokenTtl, current);
            if (!updated.getSettings().equals(current.getSettings())) {
                registeredClientRepository.save(RegisteredClient.from(client)
                        .tokenSettings(updated)
                        .build());
                log.info("Updated OAuth2 token lifetimes for client '{}'", client.getClientId());
            }
        }
    }

    static TokenSettings resolveSettings(String clientId, String androidDevClientId,
                                         String accessTokenTtl, String refreshTokenTtl,
                                         String androidDevAccessTokenTtl, String androidDevRefreshTokenTtl,
                                         TokenSettings current) {
        boolean androidDevClient = clientId.equals(androidDevClientId) && !androidDevClientId.isBlank();
        String selectedAccessTtl = androidDevClient ? androidDevAccessTokenTtl : accessTokenTtl;
        String selectedRefreshTtl = androidDevClient ? androidDevRefreshTokenTtl : refreshTokenTtl;
        return TokenSettings.builder()
                .settings(settings -> settings.putAll(current.getSettings()))
                .accessTokenTimeToLive(Duration.parse(selectedAccessTtl))
                .refreshTokenTimeToLive(Duration.parse(selectedRefreshTtl))
                .build();
    }
}
