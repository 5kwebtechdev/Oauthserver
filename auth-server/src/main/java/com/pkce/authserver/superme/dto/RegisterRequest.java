package com.pkce.authserver.superme.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

import java.time.LocalDate;

/**
 * Copied from SuperMeBE (com.superme.dto.RegisterRequest), so the registration payload is the same
 * one their own /register takes. Two fields are added at the end for proving ownership of the
 * identifier being registered - see RegisterController.
 */
@Data
public class RegisterRequest {

    // Required fields only for registration
    private String name;
    private String username;
    private String gender;
    private String relationship;
    private LocalDate dateOfBirth;
    private String password;

    private String petName;

    private String avatarName;

    private String avatarImageName;

    @Pattern(regexp = "^[A-Za-z0-9]{8}$",
            message = "Family code must be exactly 8 alphanumeric characters")
    private String familyCode;

    private String familyName;

    private String referralCode;

    /**
     * Only meaningful when relationship=SELF. Marks the user as intending to
     * join a family as a CHILD later via family code, while behaving exactly
     * like a normal SELF user until then.
     */
    private Boolean asChild;

    /**
     * Final onboarding step - the "Unlock Your Potential" screen. When true,
     * onboardingStep is set to 7 (fully complete); when false/absent, the
     * step stays at whatever it would otherwise be (5 or 6), meaning this
     * last step is still pending.
     */
    private Boolean unlockPotential;

    /**
     * Ensure at least one of email or phone is provided.
     */
    @AssertTrue(message = "Either email or phone must be provided")
    public boolean isEmailOrPhoneProvided() {
        return (email != null && !email.isEmpty()) || (phone != null && !phone.isEmpty());
    }

    // Email - single field (original)
    @Email(message = "Must be valid email format")
    private String email;

    // Phone split: country code and national number
    @Pattern(regexp = "^\\+[1-9]\\d{1,4}$",
            message = "Country code must be +91, +1, +44 etc.")
    private String countryCode;

    @Pattern(regexp = "^[0-9]{7,15}$",
            message = "Phone must be 7-15 digits")
    private String phone;

    // ─────────────────────────────
    // Proof of ownership - not in SuperMeBE's version
    // ─────────────────────────────
    /**
     * SuperMeBE's /register trusts that its own /register/verify-otp ran first, because the same
     * app served both. This one is reachable on its own, so it has to carry the proof itself:
     * either the emailed one-time code, or a Google ID token whose verified email matches.
     */
    private String otp;

    private String googleIdToken;
}
