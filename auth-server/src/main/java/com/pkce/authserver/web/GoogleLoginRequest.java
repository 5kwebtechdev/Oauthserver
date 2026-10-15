package com.pkce.authserver.web;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDate;

/**
 * Google proves identity, while the remaining fields complete a SuperMe profile when this is a
 * first sign-in. They are intentionally optional so an existing account can sign in with only
 * the Google ID token; for a new account the controller requires the profile fields needed by the
 * shared SuperMe user table.
 */
public record GoogleLoginRequest(
        @NotBlank String idToken,
        String name,
        String gender,
        LocalDate dateOfBirth,
        String relationship,
        String familyName,
        String familyCode,
        String petName,
        String username,
        String avatarImageName,
        String referralCode,
        Boolean asChild,
        Boolean unlockPotential) {
}
