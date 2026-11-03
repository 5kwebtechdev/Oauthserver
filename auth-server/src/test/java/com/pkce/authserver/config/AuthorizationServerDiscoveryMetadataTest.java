package com.pkce.authserver.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationServerMetadata;
import org.springframework.security.oauth2.server.authorization.oidc.OidcProviderConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AuthorizationServerDiscoveryMetadataTest {

    private static final List<String> APP_SCOPES = List.of("openid", "profile", "notes.read", "notes.write");

    @Test
    void oauthMetadataAdvertisesPublicTokenAuthenticationAndSupportedScopes() {
        var builder = OAuth2AuthorizationServerMetadata.builder()
                .issuer("https://auth.supermeapp.com")
                .authorizationEndpoint("https://auth.supermeapp.com/oauth2/authorize")
                .tokenEndpoint("https://auth.supermeapp.com/oauth2/token")
                .responseType("code");

        AuthorizationServerConfig.customizeOAuthMetadata(builder);

        var metadata = builder.build();
        assertThat(metadata.getClaims().get("token_endpoint_auth_methods_supported"))
                .asList().contains("none");
        assertThat(metadata.getClaims().get("scopes_supported")).isEqualTo(APP_SCOPES);
    }

    @Test
    void oidcMetadataAdvertisesPublicTokenAuthenticationAndSupportedScopes() {
        var builder = OidcProviderConfiguration.builder()
                .issuer("https://auth.supermeapp.com")
                .authorizationEndpoint("https://auth.supermeapp.com/oauth2/authorize")
                .tokenEndpoint("https://auth.supermeapp.com/oauth2/token")
                .jwkSetUrl("https://auth.supermeapp.com/oauth2/jwks")
                .responseType("code")
                .subjectType("public")
                .idTokenSigningAlgorithm("RS256")
                .scope("openid");

        AuthorizationServerConfig.customizeOidcMetadata(builder);

        var metadata = builder.build();
        assertThat(metadata.getClaims().get("token_endpoint_auth_methods_supported"))
                .asList().contains("none");
        assertThat(metadata.getClaims().get("scopes_supported")).isEqualTo(APP_SCOPES);
    }
}
