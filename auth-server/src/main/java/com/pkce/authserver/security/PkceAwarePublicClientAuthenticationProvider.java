package com.pkce.authserver.security;

import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2ErrorCodes;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.endpoint.PkceParameterNames;
import org.springframework.security.oauth2.server.authorization.OAuth2Authorization;
import org.springframework.security.oauth2.server.authorization.OAuth2AuthorizationService;
import org.springframework.security.oauth2.server.authorization.OAuth2TokenType;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2ClientAuthenticationToken;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClient;
import org.springframework.security.oauth2.server.authorization.client.RegisteredClientRepository;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;
import java.util.Map;

/**
 * Replaces Spring Authorization Server's stock PublicClientAuthenticationProvider, whose
 * authenticate() unconditionally demands a PKCE code_verifier for EVERY request from a
 * secretless client - including refresh_token grant requests, which have no "code" or
 * code_verifier at all. That blanket rule is what makes Spring never issue a
 * refresh_token to a public client (see OAuth2RefreshTokenGenerator), independent of
 * TokenSettings. This provider still enforces PKCE in full for the authorization_code
 * grant (same hash comparison the stock verifier does - just implemented directly here,
 * since CodeVerifierAuthenticator is package-private and not reusable), but does not
 * apply that check to other grant types. A rotated, reuse-detected refresh token (see
 * ReuseDetectingAuthorizationService) is itself the proof of possession for the
 * refresh_token grant, consistent with OAuth 2.0 Security BCP's position that
 * PKCE-protected public clients may be issued rotating refresh tokens - this is a
 * deliberate, explicit policy choice, not a workaround to bypass PKCE.
 */
public class PkceAwarePublicClientAuthenticationProvider implements AuthenticationProvider {

    private final RegisteredClientRepository registeredClientRepository;
    private final OAuth2AuthorizationService authorizationService;

    public PkceAwarePublicClientAuthenticationProvider(RegisteredClientRepository registeredClientRepository,
                                                         OAuth2AuthorizationService authorizationService) {
        this.registeredClientRepository = registeredClientRepository;
        this.authorizationService = authorizationService;
    }

    @Override
    public Authentication authenticate(Authentication authentication) throws AuthenticationException {
        OAuth2ClientAuthenticationToken clientAuthentication = (OAuth2ClientAuthenticationToken) authentication;

        if (!ClientAuthenticationMethod.NONE.equals(clientAuthentication.getClientAuthenticationMethod())) {
            return null;
        }

        String clientId = String.valueOf(clientAuthentication.getPrincipal());
        RegisteredClient registeredClient = registeredClientRepository.findByClientId(clientId);
        if (registeredClient == null) {
            throw invalidClient("client_id");
        }
        if (!registeredClient.getClientAuthenticationMethods().contains(clientAuthentication.getClientAuthenticationMethod())) {
            throw invalidClient("authentication_method");
        }

        Map<String, Object> parameters = clientAuthentication.getAdditionalParameters();
        String grantType = String.valueOf(parameters.get(OAuth2ParameterNames.GRANT_TYPE));

        if ("authorization_code".equals(grantType)) {
            verifyPkce(parameters, registeredClient);
        }

        return new OAuth2ClientAuthenticationToken(registeredClient, clientAuthentication.getClientAuthenticationMethod(), null);
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return OAuth2ClientAuthenticationToken.class.isAssignableFrom(authentication);
    }

    private void verifyPkce(Map<String, Object> parameters, RegisteredClient registeredClient) {
        String code = (String) parameters.get(OAuth2ParameterNames.CODE);
        if (!StringUtils.hasText(code)) {
            throw invalidGrant("code");
        }

        OAuth2Authorization authorization = authorizationService.findByToken(code, new OAuth2TokenType(OAuth2ParameterNames.CODE));
        if (authorization == null) {
            throw invalidGrant("code");
        }

        OAuth2AuthorizationRequest authorizationRequest =
                authorization.getAttribute(OAuth2AuthorizationRequest.class.getName());
        String codeChallenge = authorizationRequest == null ? null
                : (String) authorizationRequest.getAdditionalParameters().get(PkceParameterNames.CODE_CHALLENGE);

        if (!StringUtils.hasText(codeChallenge)) {
            if (registeredClient.getClientSettings().isRequireProofKey()) {
                throw invalidGrant("code_challenge");
            }
            return;
        }

        String codeChallengeMethod = (String) authorizationRequest.getAdditionalParameters()
                .getOrDefault(PkceParameterNames.CODE_CHALLENGE_METHOD, "plain");
        String codeVerifier = (String) parameters.get(PkceParameterNames.CODE_VERIFIER);
        if (!StringUtils.hasText(codeVerifier)) {
            throw invalidGrant("code_verifier");
        }

        boolean matches = "S256".equals(codeChallengeMethod)
                ? codeChallenge.equals(sha256Base64Url(codeVerifier))
                : codeChallenge.equals(codeVerifier);
        if (!matches) {
            throw invalidGrant("code_verifier");
        }
    }

    private static String sha256Base64Url(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static OAuth2AuthenticationException invalidClient(String detail) {
        return new OAuth2AuthenticationException(new OAuth2Error(OAuth2ErrorCodes.INVALID_CLIENT,
                "Client authentication failed: " + detail, null));
    }

    private static OAuth2AuthenticationException invalidGrant(String detail) {
        return new OAuth2AuthenticationException(new OAuth2Error(OAuth2ErrorCodes.INVALID_GRANT,
                "PKCE verification failed: " + detail, null));
    }
}
