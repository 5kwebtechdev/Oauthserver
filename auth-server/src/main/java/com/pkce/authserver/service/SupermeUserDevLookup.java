package com.pkce.authserver.service;

import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.supermedev.repository.UserDevRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * Dev-schema counterpart of SupermeUserLookup - identical identifier-resolution logic (email
 * first, then the same phone-candidate generation), just against UserDevRepository/superme_db
 * instead of SupermeUserRepository/mindfullP1. See UserDevRepository's Javadoc for why this reads
 * the same User entity class rather than a separate dev-only one.
 */
@Service
@RequiredArgsConstructor
public class SupermeUserDevLookup {

    private final UserDevRepository userRepository;

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
        return findByAnyPhoneCandidate(trimmed);
    }

    private Optional<User> findByAnyPhoneCandidate(String phone) {
        for (String candidate : phoneLookupCandidates(phone)) {
            Optional<User> u = userRepository.findByPhone(candidate);
            if (u.isPresent()) return u;
        }
        return Optional.empty();
    }

    private static boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    }

    private static List<String> phoneLookupCandidates(String phone) {
        if (phone == null) return List.of();
        String raw = phone.trim();
        if (raw.isEmpty()) return List.of();

        String stripped = raw.replaceAll("[\\s\\-()]", "");

        if (stripped.startsWith("00")) {
            stripped = "+" + stripped.substring(2);
        }

        List<String> out = new ArrayList<>();
        addUnique(out, raw);
        addUnique(out, stripped);

        if (stripped.startsWith("+")) {
            String digitsOnly = stripped.substring(1).replaceAll("\\D", "");
            addUnique(out, "+" + digitsOnly);

            if (digitsOnly.startsWith("91") && digitsOnly.length() > 2) {
                addUnique(out, "+91 " + digitsOnly.substring(2));
            }
        } else {
            String digitsOnly = stripped.replaceAll("\\D", "");
            addUnique(out, digitsOnly);

            if (!digitsOnly.isEmpty()) {
                addUnique(out, "+" + digitsOnly);
            }

            if (digitsOnly.startsWith("91") && digitsOnly.length() > 2) {
                String rest = digitsOnly.substring(2);
                addUnique(out, "+91" + rest);
                addUnique(out, "+91 " + rest);
            }

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
