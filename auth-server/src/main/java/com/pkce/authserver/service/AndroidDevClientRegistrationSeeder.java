package com.pkce.authserver.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.oidc.OidcScopes;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.settings.ClientSettings;
import org.springframework.security.oauth2.server.authorization.settings.TokenSettings;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;

/**
 * Dedicated registration for the native Android DEV app. It is deliberately separate from
 * ClientRegistrationSeeder so this public client's seven-day refresh policy cannot alter the
 * existing hosted website client's registration or token lifetime.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AndroidDevClientRegistrationSeeder implements ApplicationRunner {

    private final RegisteredClientRepository registeredClientRepository;

    @Value("${app.security.android-dev-client.id:}")
    private String clientId;

    @Value("${app.security.android-dev-client.redirect-uris:}")
    private String redirectUris;

    @Value("${app.security.android-dev-client.post-logout-redirect-uris:}")
    private String postLogoutRedirectUris;

    @Value("${app.security.android-dev-client.access-token-ttl:PT15M}")
    private String accessTokenTtl;

    @Value("${app.security.android-dev-client.refresh-token-ttl:P7D}")
    private String refreshTokenTtl;

    @Override
    public void run(ApplicationArguments args) {
        // No Android registration until the frontend has supplied its actual native callbacks.
        if (!StringUtils.hasText(clientId)) return;
        var redirects = values(redirectUris, "ANDROID_DEV_OAUTH_REDIRECT_URIS");
        var logoutRedirects = values(postLogoutRedirectUris, "ANDROID_DEV_OAUTH_POST_LOGOUT_REDIRECT_URIS");
        if (redirects.isEmpty() || logoutRedirects.isEmpty()) {
            throw new IllegalArgumentException("Android DEV OAuth client requires login and post-logout redirect URIs");
        }
        if (registeredClientRepository.findByClientId(clientId) != null) {
            log.info("Android DEV OAuth client '{}' already exists; preserving its registered URIs", clientId);
            return;
        }

        Duration accessTtl = Duration.parse(accessTokenTtl);
        Duration refreshTtl = Duration.parse(refreshTokenTtl);
        RegisteredClient.Builder builder = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(clientId)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .scope("notes.read")
                .scope("notes.write")
                .clientSettings(ClientSettings.builder()
                        .requireAuthorizationConsent(false)
                        .requireProofKey(true)
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(accessTtl)
                        .refreshTokenTimeToLive(refreshTtl)
                        .reuseRefreshTokens(false)
                        .build());
        redirects.forEach(builder::redirectUri);
        logoutRedirects.forEach(builder::postLogoutRedirectUri);
        registeredClientRepository.save(builder.build());
        log.info("Registered isolated Android DEV public OAuth client '{}'", clientId);
    }

    private static java.util.List<String> values(String csv, String propertyName) {
        if (!StringUtils.hasText(csv)) return java.util.List.of();
        var result = Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
        if (result.isEmpty()) {
            throw new IllegalArgumentException(propertyName + " must contain at least one URI");
        }
        return result;
    }
}
