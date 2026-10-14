package com.pkce.authserver.superme.util;

import java.util.Random;

/** Copied verbatim from SuperMeBE (com.superme.util.AvatarNameGenerator). */
public class AvatarNameGenerator {

    private static final Random RANDOM = new Random();

    public static String generate(String fullName) {

        String cleaned = fullName
                .toLowerCase()
                .replaceAll("[^a-z]", "");

        String prefix = cleaned.length() >= 4
                ? cleaned.substring(0, 4)
                : cleaned;

        int minDigits = Math.max(1, 5 - prefix.length());
        int maxDigits = Math.min(8, 12 - prefix.length());

        int digits = minDigits + RANDOM.nextInt(maxDigits - minDigits + 1);

        String number = RANDOM.ints(digits, 0, 10)
                .collect(StringBuilder::new,
                        StringBuilder::append,
                        StringBuilder::append)
                .toString();

        return prefix + number;
    }
}
