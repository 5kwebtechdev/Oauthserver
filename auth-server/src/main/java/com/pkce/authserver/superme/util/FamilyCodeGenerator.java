package com.pkce.authserver.superme.util;

import java.security.SecureRandom;

/** Copied verbatim from SuperMeBE (com.superme.util.FamilyCodeGenerator). */
public class FamilyCodeGenerator {

    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generateFamilyCode(String familyName) {
        // 1. Clean & normalize name
        String prefix = familyName.trim().replaceAll("\\s+", "").toUpperCase();

        // 2. Take first 3 characters from name (pad if short)
        if (prefix.length() < 3) {
            prefix = String.format("%-3s", prefix).replace(' ', 'X');
        } else {
            prefix = prefix.substring(0, 3);
        }

        // 3. Generate 5 random alphanumeric characters
        StringBuilder suffix = new StringBuilder();
        for (int i = 0; i < 5; i++) {
            suffix.append(CHARACTERS.charAt(RANDOM.nextInt(CHARACTERS.length())));
        }

        // 4. Combine for total 8 chars
        return prefix + suffix;
    }
}
