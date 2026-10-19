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

    @Value("${app.security.additional-client.id:}")
    private String additionalClientId;
    @Value("${app.security.additional-client.redirect-uris:}")
    private String additionalRedirectUris;
    @Value("${app.security.additional-client.post-logout-redirect-uri:}")
    private String additionalLogoutUri;

    @Value("${app.security.admin-client.id:}")
    private String adminClientId;
    @Value("${app.security.admin-client.redirect-uris:}")
    private String adminRedirectUris;
    @Value("${app.security.admin-client.post-logout-redirect-uri:}")
    private String adminLogoutUri;

    // Separate dev-only client for the admin panel (e.g. devadmin.supermeapp.com) - kept as its
    // own client_id rather than a second redirect URI on admin-client, matching this project's
    // established one-client-per-frontend pattern (see the primary-vs-additional pair above):
    // registration is idempotent and never updates an already-seeded client, so a prod client's
    // redirect URIs cannot be widened later just by editing env vars and restarting.
    @Value("${app.security.admin-dev-client.id:}")
    private String adminDevClientId;
    @Value("${app.security.admin-dev-client.redirect-uris:}")
    private String adminDevRedirectUris;
    @Value("${app.security.admin-dev-client.post-logout-redirect-uri:}")
    private String adminDevLogoutUri;

    // Dev client for the SuperMeApp mobile/APK web build (e.g. devapk.supermeapp.com) - same
    // reasoning as admin-dev-client above: its own client_id, not a second redirect URI on the
    // existing additional-client (which stays exactly as-is, serving the real prod 4204 build).
    @Value("${app.security.apk-dev-client.id:}")
    private String apkDevClientId;
    @Value("${app.security.apk-dev-client.redirect-uris:}")
    private String apkDevRedirectUris;
    @Value("${app.security.apk-dev-client.post-logout-redirect-uri:}")
    private String apkDevLogoutUri;

    @Override
    public void run(ApplicationArguments args) {
        register(clientId, redirectUris, postLogoutRedirectUri);
        if (!additionalClientId.isBlank()) {
            if (additionalClientId.equals(clientId) || additionalRedirectUris.isBlank() || additionalLogoutUri.isBlank()) {
                throw new IllegalArgumentException("Additional frontend needs a distinct client ID, callbacks and logout URL");
            }
            register(additionalClientId, additionalRedirectUris, additionalLogoutUri);
        }
        if (!adminClientId.isBlank()) {
            if (adminClientId.equals(clientId) || adminClientId.equals(additionalClientId)
                    || adminRedirectUris.isBlank() || adminLogoutUri.isBlank()) {
                throw new IllegalArgumentException("Admin client needs a distinct client ID, callbacks and logout URL");
            }
            register(adminClientId, adminRedirectUris, adminLogoutUri);
        }
        if (!adminDevClientId.isBlank()) {
            if (adminDevClientId.equals(clientId) || adminDevClientId.equals(additionalClientId)
                    || adminDevClientId.equals(adminClientId)
                    || adminDevRedirectUris.isBlank() || adminDevLogoutUri.isBlank()) {
                throw new IllegalArgumentException("Admin dev client needs a distinct client ID, callbacks and logout URL");
            }
            register(adminDevClientId, adminDevRedirectUris, adminDevLogoutUri);
        }
        if (!apkDevClientId.isBlank()) {
            if (apkDevClientId.equals(clientId) || apkDevClientId.equals(additionalClientId)
                    || apkDevClientId.equals(adminClientId) || apkDevClientId.equals(adminDevClientId)
                    || apkDevRedirectUris.isBlank() || apkDevLogoutUri.isBlank()) {
                throw new IllegalArgumentException("APK dev client needs a distinct client ID, callbacks and logout URL");
            }
            register(apkDevClientId, apkDevRedirectUris, apkDevLogoutUri);
        }
    }

    private void register(String clientId, String redirectUris, String postLogoutRedirectUri) {
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
                        .accessTokenTimeToLive(Duration.ofMinutes(2))
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
