package com.pkce.authserver.service;

import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.concurrent.ConcurrentHashMap;

/** Short-lived, single-use bridge for Google signups started on the BE login page. */
@Service
public class GoogleSignupHandoffService {

    private static final long TICKET_LIFETIME_SECONDS = 300;
    private static final SecureRandom RANDOM = new SecureRandom();
    private final ConcurrentHashMap<String, PendingSignup> pending = new ConcurrentHashMap<>();

    public String issue(String idToken, GoogleLoginService.GoogleIdentity identity) {
        Instant now = Instant.now();
        pending.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        pending.put(ticket, new PendingSignup(idToken, identity, now.plusSeconds(TICKET_LIFETIME_SECONDS)));
        return ticket;
    }

    public SignupIdentity consume(String ticket) {
        if (ticket == null || ticket.isBlank()) throw new HandoffNotFoundException();
        PendingSignup signup = pending.remove(ticket);
        if (signup == null || !signup.expiresAt().isAfter(Instant.now())) throw new HandoffNotFoundException();
        GoogleLoginService.GoogleIdentity identity = signup.identity();
        return new SignupIdentity(signup.idToken(), identity.providerId(), identity.email(),
                identity.name(), identity.pictureUrl());
    }

    private record PendingSignup(String idToken, GoogleLoginService.GoogleIdentity identity, Instant expiresAt) { }
    public record SignupIdentity(String idToken, String providerId, String email, String name, String avatarUrl) { }
    public static class HandoffNotFoundException extends RuntimeException { }
}
