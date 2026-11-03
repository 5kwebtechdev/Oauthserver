package com.pkce.authserver;

import com.pkce.authserver.service.AndroidDevClientRegistrationSeeder;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AndroidDevClientRegistrationSeederTest {

    @Test
    void registersAnIsolatedPublicPkceClientWithSevenDayRefreshLifetime() throws Exception {
        InMemoryRegisteredClientRepository repository = new InMemoryRegisteredClientRepository();
        var seeder = configuredSeeder(repository);

        seeder.run(new DefaultApplicationArguments(new String[0]));

        RegisteredClient android = repository.findByClientId("supermeapp-dev-android");
        assertThat(android.getClientId()).isEqualTo("supermeapp-dev-android");
        assertThat(android.getClientAuthenticationMethods()).containsExactly(ClientAuthenticationMethod.NONE);
        assertThat(android.getAuthorizationGrantTypes()).containsExactlyInAnyOrder(
                AuthorizationGrantType.AUTHORIZATION_CODE, AuthorizationGrantType.REFRESH_TOKEN);
        assertThat(android.getRedirectUris()).containsExactlyInAnyOrder(
                "https://app.example.test/callback", "com.example.app:/oauth2redirect");
        assertThat(android.getPostLogoutRedirectUris()).containsExactly("com.example.app:/logout");
        assertThat(android.getScopes()).containsExactlyInAnyOrder("openid", "profile", "notes.read", "notes.write");
        assertThat(android.getClientSettings().isRequireProofKey()).isTrue();
        assertThat(android.getTokenSettings().getAccessTokenTimeToLive()).isEqualTo(Duration.ofMinutes(15));
        assertThat(android.getTokenSettings().getRefreshTokenTimeToLive()).isEqualTo(Duration.ofDays(7));
        assertThat(android.getTokenSettings().isReuseRefreshTokens()).isFalse();
    }

    @Test
    void doesNothingUntilTheFrontendSuppliesAnAndroidClientId() throws Exception {
        InMemoryRegisteredClientRepository repository = new InMemoryRegisteredClientRepository();
        var seeder = new AndroidDevClientRegistrationSeeder(repository);
        seeder.run(new DefaultApplicationArguments(new String[0]));
        assertThat(repository.clients).isEmpty();
    }

    @Test
    void refusesAnEnabledClientWithoutConfirmedRedirectUris() {
        InMemoryRegisteredClientRepository repository = new InMemoryRegisteredClientRepository();
        var seeder = new AndroidDevClientRegistrationSeeder(repository);
        ReflectionTestUtils.setField(seeder, "clientId", "supermeapp-dev-android");

        assertThatThrownBy(() -> seeder.run(new DefaultApplicationArguments(new String[0])))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("requires login and post-logout redirect URIs");
        assertThat(repository.clients).isEmpty();
    }

    private static AndroidDevClientRegistrationSeeder configuredSeeder(RegisteredClientRepository repository) {
        var seeder = new AndroidDevClientRegistrationSeeder(repository);
        ReflectionTestUtils.setField(seeder, "clientId", "supermeapp-dev-android");
        ReflectionTestUtils.setField(seeder, "redirectUris",
                "https://app.example.test/callback, com.example.app:/oauth2redirect");
        ReflectionTestUtils.setField(seeder, "postLogoutRedirectUris", "com.example.app:/logout");
        ReflectionTestUtils.setField(seeder, "accessTokenTtl", "PT15M");
        ReflectionTestUtils.setField(seeder, "refreshTokenTtl", "P7D");
        return seeder;
    }

    private static final class InMemoryRegisteredClientRepository implements RegisteredClientRepository {
        private final Map<String, RegisteredClient> clients = new HashMap<>();

        @Override
        public void save(RegisteredClient registeredClient) {
            clients.put(registeredClient.getClientId(), registeredClient);
        }

        @Override
        public RegisteredClient findById(String id) {
            return clients.values().stream().filter(client -> client.getId().equals(id)).findFirst().orElse(null);
        }

        @Override
        public RegisteredClient findByClientId(String clientId) {
            return clients.get(clientId);
        }
    }
}
