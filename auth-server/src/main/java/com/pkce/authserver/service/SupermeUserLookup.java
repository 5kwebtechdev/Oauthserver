package com.pkce.authserver.service;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.superme.model.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Resolves the single identifier typed on the login form to a SuperMeBE user.
 *
 * SuperMeBE logs in by email or phone and never by username (their UserService.login takes
 * (email, phone, password) and their LoginController decides which from the request body). This
 * server only has one text field, so it tries email first, then phone - which makes both of their
 * accepted identifier kinds work through one field.
 *
 * The phone-candidate generation is copied from their UserService.phoneLookupCandidates so that a
 * number typed as "9876543210", "+919876543210" or "+91 9876543210" finds the same row here as it
 * does there; the column stores only one of those forms per user and which one varies by how the
 * account was created.
 */
@Service
@RequiredArgsConstructor
public class SupermeUserLookup {

    private final SupermeUserRepository userRepository;

    public Optional<User> findByIdentifier(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();

        if (isValidEmail(trimmed)) {
            Optional<User> byEmail = userRepository.findByEmail(trimmed);
            if (byEmail.isPresent()) {
                return byEmail;
            }
        }
        return findByAnyPhoneCandidate(trimmed, null);
    }

    private Optional<User> findByAnyPhoneCandidate(String phone, String countryCode) {
        for (String candidate : phoneLookupCandidates(phone, countryCode)) {
            Optional<User> u = userRepository.findByPhone(candidate);
            if (u.isPresent()) return u;
        }
        return Optional.empty();
    }

    private static boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    }

    public static List<String> phoneLookupCandidates(String phone, String countryCode) {
        if (phone == null) return List.of();
        String raw = phone.trim();
        if (raw.isEmpty()) return List.of();

        // Remove common separators but keep leading '+' if present.
        String stripped = raw.replaceAll("[\\s\\-()]", "");

        // Support inputs like 0091... -> +91...
        if (stripped.startsWith("00")) {
            stripped = "+" + stripped.substring(2);
        }

        List<String> out = new ArrayList<>();
        addUnique(out, raw);
        addUnique(out, stripped);

        // Registration submits countryCode and phone separately. The user table stores only the
        // phone string, and older records may contain either the national number or E.164 form.
        // Check both representations so a formatting difference cannot permit a duplicate.
        String digitsOnly = stripped.replaceAll("\\D", "");
        String prefixDigits = countryCode == null ? "" : countryCode.replaceAll("\\D", "");
        if (!prefixDigits.isEmpty() && !digitsOnly.isEmpty()) {
            if (!stripped.startsWith("+") && !digitsOnly.startsWith(prefixDigits)) {
                addUnique(out, "+" + prefixDigits + digitsOnly);
                addUnique(out, "+" + prefixDigits + " " + digitsOnly);
            } else if (digitsOnly.startsWith(prefixDigits) && digitsOnly.length() > prefixDigits.length()) {
                // Also check the national-only form when the caller supplied an E.164 number.
                addUnique(out, digitsOnly.substring(prefixDigits.length()));
            }
        } else if (prefixDigits.isEmpty() && digitsOnly.startsWith("91") && digitsOnly.length() == 12) {
            // India is the only default country-code inference, matching the app's existing lookup.
            addUnique(out, digitsOnly.substring(2));
        }

        if (stripped.startsWith("+")) {
            String internationalDigits = stripped.substring(1).replaceAll("\\D", "");
            addUnique(out, "+" + internationalDigits);

            // Also try "+CC <number>" variant for DBs that store a space.
            if (internationalDigits.startsWith("91") && internationalDigits.length() > 2) {
                addUnique(out, "+91 " + internationalDigits.substring(2));
            }
        } else {
            addUnique(out, digitsOnly);

            // Try E.164-like variant.
            if (!digitsOnly.isEmpty()) {
                addUnique(out, "+" + digitsOnly);
            }

            // If the client sends country-code-prefixed digits without '+', also try "+CC <number>".
            if (digitsOnly.startsWith("91") && digitsOnly.length() > 2) {
                String rest = digitsOnly.substring(2);
                addUnique(out, "+91" + rest);
                addUnique(out, "+91 " + rest);
            }

            // India default (common in this project). This is only a lookup candidate.
            if (digitsOnly.length() == 10) {
                addUnique(out, "+91" + digitsOnly);
                addUnique(out, "+91 " + digitsOnly);
            }
        }

        return out;
    }

    private static void addUnique(List<String> list, String value) {
        if (value == null) return;
        String v = value.trim();
        if (v.isEmpty()) return;
        if (!list.contains(v)) list.add(v);
    }
}
