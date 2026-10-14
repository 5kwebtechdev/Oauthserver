package com.pkce.authserver.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.ClientAuthenticationMethod;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.endpoint.OAuth2ParameterNames;
import org.springframework.security.oauth2.core.endpoint.PkceParameterNames;
import org.springframework.security.oauth2.server.authorization.authentication.OAuth2ClientAuthenticationToken;
import org.springframework.security.web.authentication.AuthenticationConverter;
import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.Map;

/**
 * Replaces Spring's stock PublicClientAuthenticationConverter, whose convert() returns
 * null - meaning "no public-client credentials found at all" - for anything that isn't
 * specifically an authorization_code+code_verifier request. That means no
 * OAuth2ClientAuthenticationToken is ever built for a public client's refresh_token
 * request, so no AuthenticationProvider (including PkceAwarePublicClientAuthenticationProvider)
 * ever gets a chance to run - this is the actual root gate, upstream of the provider.
 * This converter recognizes both the PKCE authorization_code request and a refresh_token
 * request carrying client_id with no secret.
 */
public class PkceAwarePublicClientAuthenticationConverter implements AuthenticationConverter {

    @Override
    public Authentication convert(HttpServletRequest request) {
        String clientId = request.getParameter(OAuth2ParameterNames.CLIENT_ID);
        if (!StringUtils.hasText(clientId)) {
            return null;
        }
        String[] clientIdValues = request.getParameterValues(OAuth2ParameterNames.CLIENT_ID);
        if (clientIdValues.length != 1) {
            throw invalidRequest(OAuth2ParameterNames.CLIENT_ID);
        }

        String grantType = request.getParameter(OAuth2ParameterNames.GRANT_TYPE);
        boolean authorizationCodeWithVerifier = AuthorizationGrantType.AUTHORIZATION_CODE.getValue().equals(grantType)
                && StringUtils.hasText(request.getParameter(PkceParameterNames.CODE_VERIFIER));
        boolean refreshToken = AuthorizationGrantType.REFRESH_TOKEN.getValue().equals(grantType);

        if (!authorizationCodeWithVerifier && !refreshToken) {
            return null;
        }

        Map<String, Object> additionalParameters = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (!OAuth2ParameterNames.CLIENT_ID.equals(key)) {
                additionalParameters.put(key, values.length == 1 ? values[0] : values);
            }
        });

        return new OAuth2ClientAuthenticationToken(clientId, ClientAuthenticationMethod.NONE, null, additionalParameters);
    }

    private static OAuth2AuthenticationException invalidRequest(String parameterName) {
        return new OAuth2AuthenticationException(new OAuth2Error(
                "invalid_request", "OAuth 2.0 Parameter: " + parameterName, null));
    }
}
