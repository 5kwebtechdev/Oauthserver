package com.pkce.authserver.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;

/**
 * Verifies a Google-issued ID token (signature, issuer, audience and expiry are all checked by the
 * configured JwtDecoder - see GoogleIdTokenDecoderConfig) and reports the identity it carries.
 *
 * Shared by sign-in and registration: both need the same guarantee, that the email in the token
 * really belongs to whoever is holding it.
 */
@Service
@RequiredArgsConstructor
public class GoogleIdentityVerifier {

    private final JwtDecoder googleIdTokenDecoder;

    public Jwt verify(String googleIdToken) {
        Jwt jwt;
        try {
            jwt = googleIdTokenDecoder.decode(googleIdToken);
        } catch (JwtException | IllegalArgumentException e) {
            // IllegalArgumentException covers an empty/malformed token, which the decoder rejects
            // before it ever gets as far as throwing a JwtException.
            throw new BadCredentialsException("Invalid Google ID token", e);
        }

        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        String email = jwt.getClaimAsString("email");
        if (email == null || Boolean.FALSE.equals(emailVerified)) {
            throw new BadCredentialsException("Google account email is not verified");
        }
        return jwt;
    }

    public String verifiedEmailOf(String googleIdToken) {
        return verify(googleIdToken).getClaimAsString("email");
    }
}
