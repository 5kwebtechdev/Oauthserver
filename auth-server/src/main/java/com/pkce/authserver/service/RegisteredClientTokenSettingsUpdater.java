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

    @Value("${app.security.token.access-token-ttl:PT45M}")
    private String accessTokenTtl;

    @Value("${app.security.token.refresh-token-ttl:PT90M}")
    private String refreshTokenTtl;

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
            TokenSettings updated = TokenSettings.builder()
                    .settings(current.getSettings())
                    .accessTokenTimeToLive(Duration.parse(accessTokenTtl))
                    .refreshTokenTimeToLive(Duration.parse(refreshTokenTtl))
                    .build();
            if (!updated.getSettings().equals(current.getSettings())) {
                registeredClientRepository.save(RegisteredClient.from(client)
                        .tokenSettings(updated)
                        .build());
                log.info("Updated OAuth2 token lifetimes for client '{}'", client.getClientId());
            }
        }
    }
}
