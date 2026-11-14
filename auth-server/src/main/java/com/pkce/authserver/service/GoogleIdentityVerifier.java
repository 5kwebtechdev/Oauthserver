package com.pkce.authserver.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

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
        Jwt jwt = decode(googleIdToken);
        requireVerifiedEmail(jwt);
        return jwt;
    }

    /**
     * Strict claim checks for the DEV native SDK, isolated from the hosted website GIS flow.
     * {@code expectedAuthorizedParties} is the set of azp values allowed to present this
     * audience - more than one native Android OAuth client (e.g. a sideloaded APK build and the
     * Google Play build) can share the same server-side audience, so azp is checked by set
     * membership rather than a single exact match.
     */
    public Jwt verifyAndroidDev(String googleIdToken, String expectedAudience,
                                Set<String> expectedAuthorizedParties, String expectedNonce) {
        Jwt jwt = decode(googleIdToken);
        requireVerifiedEmail(jwt);
        if (!StringUtils.hasText(jwt.getClaimAsString("email"))
                || !Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified"))) {
            throw new BadCredentialsException("Google account email is not verified");
        }
        if (expectedAudience == null || !expectedAudience.equals(expectedAudience.trim())
                || jwt.getAudience() == null || jwt.getAudience().size() != 1
                || !jwt.getAudience().contains(expectedAudience)) {
            throw new BadCredentialsException("Google ID token has an invalid audience");
        }
        String azp = jwt.getClaimAsString("azp");
        if (expectedAuthorizedParties == null || expectedAuthorizedParties.isEmpty()
                || azp == null || azp.isBlank()
                || !expectedAuthorizedParties.contains(azp)) {
            throw new BadCredentialsException("Google ID token has an invalid authorized party");
        }
        if (expectedNonce == null || expectedNonce.isBlank()
                || !expectedNonce.equals(jwt.getClaimAsString("nonce"))) {
            throw new BadCredentialsException("Google ID token nonce does not match this sign-in attempt");
        }
        return jwt;
    }

    /**
     * Parses a comma-separated azp allow-list (trims whitespace, discards empty entries). A
     * single bare value (the existing single-client configuration) parses to a one-element set,
     * so existing deployments with only one configured azp keep working unchanged.
     */
    public static Set<String> parseAuthorizedParties(String rawCommaSeparated) {
        if (rawCommaSeparated == null) {
            return Set.of();
        }
        return Arrays.stream(rawCommaSeparated.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
    }

    private Jwt decode(String googleIdToken) {
        Jwt jwt;
        try {
            jwt = googleIdTokenDecoder.decode(googleIdToken);
        } catch (JwtException | IllegalArgumentException e) {
            // IllegalArgumentException covers an empty/malformed token, which the decoder rejects
            // before it ever gets as far as throwing a JwtException.
            throw new BadCredentialsException("Invalid Google ID token", e);
        }
        return jwt;
    }

    private static void requireVerifiedEmail(Jwt jwt) {
        Boolean emailVerified = jwt.getClaimAsBoolean("email_verified");
        String email = jwt.getClaimAsString("email");
        if (email == null || Boolean.FALSE.equals(emailVerified)) {
            throw new BadCredentialsException("Google account email is not verified");
        }
    }

    public String verifiedEmailOf(String googleIdToken) {
        return verify(googleIdToken).getClaimAsString("email");
    }
}
