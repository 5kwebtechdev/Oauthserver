package com.pkce.authserver.service;

import com.pkce.authserver.superme.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2RefreshToken;
import org.springframework.security.oauth2.core.OAuth2Token;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContext;
import org.springframework.security.oauth2.server.authorization.context.AuthorizationServerContextHolder;
import org.springframework.security.oauth2.server.authorization.settings.AuthorizationServerSettings;
import org.springframework.security.oauth2.server.authorization.token.DefaultOAuth2TokenContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenContext;
import org.springframework.security.oauth2.server.authorization.token.OAuth2TokenGenerator;
import org.springframework.stereotype.Service;

import org.springframework.security.oauth2.core.oidc.OidcScopes;

import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Issues a real access token (and refresh token) for a user outside the authorization-code flow,
 * so registration can answer with tokens directly instead of making a brand-new user bounce back
 * through /oauth2/authorize before they can do anything.
 *
 * The tokens are minted by the authorization server's own OAuth2TokenGenerator and the resulting
 * OAuth2Authorization is persisted through the same OAuth2AuthorizationService the code flow uses,
 * so they are not a parallel token system: the access token carries the usual claims (including
 * roles and the resource-server audience), the resource server validates it exactly as it does any
 * other, and the refresh token works at /oauth2/token with the normal rotation and reuse-detection.
 *
 * Note this path does not go through PKCE, because there is no code to exchange - the proof of
 * identity is the registration itself (a verified OTP or a verified Google ID token). PKCE still
 * governs every /oauth2/authorize login; nothing about that changed. No id_token is minted here:
 * OIDC id_tokens belong to the authorize flow, which is where a client that needs one gets it.
 */
@Service
@RequiredArgsConstructor
public class TokenIssuanceService {

    private final RegisteredClientRepository registeredClientRepository;
    private final OAuth2AuthorizationService authorizationService;
    private final OAuth2TokenGenerator<OAuth2Token> tokenGenerator;
    private final AuthorizationServerSettings authorizationServerSettings;
    private final AppUserDetailsService appUserDetailsService;
    private final SupermeUserInfoService userInfoService;

    @Value("${app.security.client.id:pkce-angular-client}")
    private String clientId;

    @Value("${app.security.issuer:http://localhost:9000}")
    private String issuer;

    /** The same field set /oauth2/token answers with, so a caller can treat both identically. */
    public Map<String, Object> issueTokens(User user) {
        RegisteredClient registeredClient = registeredClientRepository.findByClientId(clientId);
        if (registeredClient == null) {
            throw new IllegalStateException("Client '" + clientId + "' is not registered - cannot issue tokens");
        }

        UserDetails userDetails = appUserDetailsService.loadVerifiedUser(user);
        Authentication principal = UsernamePasswordAuthenticationToken.authenticated(
                userDetails, null, userDetails.getAuthorities());

        // Every registered scope except openid. Granting openid would make the authorization an
        // OIDC one, and a later refresh_token grant then regenerates the id_token by reading the
        // OidcIdToken off the stored authorization - JwtGenerator does that unconditionally
        // (verified in its bytecode), so with no id_token stored the refresh would fail with an
        // NPE. An id_token belongs to the authorize flow, which is where a client that wants one
        // goes; what registration owes the caller is an access token and a working refresh token.
        Set<String> scopes = registeredClient.getScopes().stream()
                .filter(scope -> !OidcScopes.OPENID.equals(scope))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        // AuthorizationServerContext is normally populated by the authorization server's own filter
        // chain; this runs on a plain /api endpoint, so it has to be supplied here or the generator
        // has no issuer to put in the token.
        AuthorizationServerContextHolder.setContext(new IssuerOnlyContext(issuer, authorizationServerSettings));
        try {
            OAuth2Authorization.Builder authorizationBuilder = OAuth2Authorization
                    .withRegisteredClient(registeredClient)
                    .principalName(principal.getName())
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .authorizedScopes(scopes)
                    // The key Spring Authorization Server itself stores the principal under, so a
                    // later refresh_token grant finds it where it expects to.
                    .attribute(java.security.Principal.class.getName(), principal);

            DefaultOAuth2TokenContext.Builder contextBuilder = DefaultOAuth2TokenContext.builder()
                    .registeredClient(registeredClient)
                    .principal(principal)
                    .authorizationServerContext(AuthorizationServerContextHolder.getContext())
                    .authorizedScopes(scopes)
                    .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                    .authorizationGrant(principal);

            OAuth2TokenContext accessTokenContext = contextBuilder.tokenType(OAuth2TokenType.ACCESS_TOKEN).build();
            OAuth2Token generatedAccessToken = generate(accessTokenContext, "access token");
            OAuth2AccessToken accessToken = new OAuth2AccessToken(
                    OAuth2AccessToken.TokenType.BEARER,
                    generatedAccessToken.getTokenValue(),
                    generatedAccessToken.getIssuedAt(),
                    generatedAccessToken.getExpiresAt(),
                    scopes);
            authorizationBuilder.accessToken(accessToken);

            OAuth2RefreshToken refreshToken = null;
            if (registeredClient.getAuthorizationGrantTypes().contains(AuthorizationGrantType.REFRESH_TOKEN)) {
                OAuth2TokenContext refreshTokenContext = contextBuilder.tokenType(OAuth2TokenType.REFRESH_TOKEN).build();
                OAuth2Token generatedRefreshToken = generate(refreshTokenContext, "refresh token");
                refreshToken = new OAuth2RefreshToken(
                        generatedRefreshToken.getTokenValue(),
                        generatedRefreshToken.getIssuedAt(),
                        generatedRefreshToken.getExpiresAt());
                authorizationBuilder.refreshToken(refreshToken);
            }

            authorizationService.save(authorizationBuilder.build());

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("access_token", accessToken.getTokenValue());
            response.put("token_type", OAuth2AccessToken.TokenType.BEARER.getValue());
            response.put("expires_in", expiresIn(accessToken));
            response.put("scope", String.join(" ", scopes));
            if (refreshToken != null) {
                response.put("refresh_token", refreshToken.getTokenValue());
            }
            // Same "user" object /oauth2/token carries, in SuperMeBE's own UserDTO shape.
            userInfoService.userPayloadFor(userDetails.getUsername())
                    .ifPresent(payload -> response.put("user", payload));
            return response;
        } finally {
            AuthorizationServerContextHolder.resetContext();
        }
    }

    private OAuth2Token generate(OAuth2TokenContext context, String what) {
        OAuth2Token token = tokenGenerator.generate(context);
        if (token == null) {
            throw new IllegalStateException("The token generator produced no " + what);
        }
        return token;
    }

    private long expiresIn(OAuth2AccessToken accessToken) {
        Instant issuedAt = Optional.ofNullable(accessToken.getIssuedAt()).orElseGet(Instant::now);
        Instant expiresAt = accessToken.getExpiresAt();
        return expiresAt == null ? 0 : Duration.between(issuedAt, expiresAt).toSeconds();
    }

    /** Minimal AuthorizationServerContext: the generator only needs the issuer and the settings. */
    private record IssuerOnlyContext(String issuer, AuthorizationServerSettings settings)
            implements AuthorizationServerContext {

        @Override
        public String getIssuer() {
            return issuer;
        }

        @Override
        public AuthorizationServerSettings getAuthorizationServerSettings() {
            return settings;
        }
    }

}
