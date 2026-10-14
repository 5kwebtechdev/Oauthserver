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

import java.time.Duration;
import java.util.Arrays;
import java.util.UUID;

/**
 * Idempotent startup registration of the public Angular client. Raw SQL seeding was deliberately
 * avoided because RegisteredClientRepository needs runtime-computed values (serialized
 * ClientSettings/TokenSettings) that are fragile to hand-write as JSON.
 *
 * This replaces the previous DataSeeder, which also created roles and two demo users. Users now
 * come from SuperMeBE's live User table, and seeding demo accounts into it would mean inserting
 * fake people into a production database used by a running app - so that half is gone entirely,
 * not ported. The only table written here is oauth2_registered_client, which this server owns.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ClientRegistrationSeeder implements ApplicationRunner {

    private final RegisteredClientRepository registeredClientRepository;

    @Value("${app.security.client.id:pkce-angular-client}")
    private String clientId;

    @Value("${app.security.client.redirect-uris:http://localhost:4200/callback}")
    private String redirectUris;

    @Value("${app.security.client.post-logout-redirect-uri:http://localhost:4200/}")
    private String postLogoutRedirectUri;

    @Override
    public void run(ApplicationArguments args) {
        if (registeredClientRepository.findByClientId(clientId) != null) {
            return;
        }
        log.info("Registering public OAuth2 client '{}'", clientId);

        // Public client, PKCE S256 required. Refresh tokens are enabled here via
        // PkceAwarePublicClientAuthenticationProvider + PkceAwareRefreshTokenGenerator
        // (AuthorizationServerConfig) - see their Javadoc for why Spring's stock
        // behavior otherwise withholds refresh tokens from any secretless client.
        RegisteredClient.Builder builder = RegisteredClient.withId(UUID.randomUUID().toString())
                .clientId(clientId)
                .clientAuthenticationMethod(ClientAuthenticationMethod.NONE)
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .authorizationGrantType(AuthorizationGrantType.REFRESH_TOKEN)
                .postLogoutRedirectUri(postLogoutRedirectUri)
                .scope(OidcScopes.OPENID)
                .scope(OidcScopes.PROFILE)
                .scope("notes.read")
                .scope("notes.write")
                .clientSettings(ClientSettings.builder()
                        .requireAuthorizationConsent(false)
                        .requireProofKey(true)
                        .build())
                .tokenSettings(TokenSettings.builder()
                        .accessTokenTimeToLive(Duration.ofMinutes(10))
                        .refreshTokenTimeToLive(Duration.ofDays(30))
                        .reuseRefreshTokens(false)
                        .build());

        Arrays.stream(redirectUris.split(","))
                .map(String::trim)
                .filter(uri -> !uri.isEmpty())
                .forEach(builder::redirectUri);

        registeredClientRepository.save(builder.build());
    }
}
