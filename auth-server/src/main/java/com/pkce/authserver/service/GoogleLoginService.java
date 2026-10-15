package com.pkce.authserver.service;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.superme.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Verifies a Google-issued ID token and matches it to an existing SuperMeApp account, by provider
 * id first and then by email.
 *
 * An unknown Google account raises AccountNotRegisteredException carrying the verified identity.
 * GoogleLoginController can then complete registration when the FE supplies the required profile
 * fields, or return the missing fields to collect first.
 *
 * On a successful match the Google provider id is recorded on the account, so a later login can be
 * matched by provider id rather than only by email - but only when writes are enabled, since that
 * is an UPDATE against live production data.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class GoogleLoginService {

    private static final String PROVIDER_TYPE = "GOOGLE";

    private final GoogleIdentityVerifier googleIdentityVerifier;
    private final SupermeUserRepository userRepository;
    private final SupermeProperties supermeProperties;

    /** No account yet - carries the verified Google identity so registration can be pre-filled. */
    public static class AccountNotRegisteredException extends RuntimeException {
        private final transient GoogleIdentity identity;

        public AccountNotRegisteredException(GoogleIdentity identity) {
            super("No SuperMeApp account exists for " + identity.email() + " - register to continue");
            this.identity = identity;
        }

        public GoogleIdentity getIdentity() {
            return identity;
        }
    }

    /** The parts of a verified Google ID token a registration form can be pre-filled from. */
    public record GoogleIdentity(String providerId, String email, String name, String pictureUrl) {
    }

    public static final class Result {
        public final User user;
        public final boolean newlyCreated;
        public final String providerId;

        public Result(User user, boolean newlyCreated, String providerId) {
            this.user = user;
            this.newlyCreated = newlyCreated;
            this.providerId = providerId;
        }
    }

    @Transactional
    public Result verifyAndUpsert(String googleIdToken) {
        Jwt jwt = googleIdentityVerifier.verify(googleIdToken);
        String email = jwt.getClaimAsString("email");
        String providerId = jwt.getSubject();

        User user = findByProviderId(providerId)
                .or(() -> userRepository.findByEmail(email))
                .orElseThrow(() -> new AccountNotRegisteredException(new GoogleIdentity(
                        providerId, email, jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"))));

        if (Boolean.TRUE.equals(user.getDeleted()) || !user.isEnabled()) {
            throw new BadCredentialsException("This account is not active");
        }

        linkProviderIfNeeded(user, providerId, jwt.getClaimAsString("picture"));
        return new Result(user, false, providerId);
    }

    /**
     * The provider-id columns have no unique constraint and the live data has duplicates on them,
     * so more than one row can come back. Rather than fail the login, prefer a usable account: not
     * soft-deleted, enabled, and with an identifier we can actually log in as; ties break on the
     * lowest id so the same Google account always lands on the same row rather than alternating.
     */
    private Optional<User> findByProviderId(String providerId) {
        List<User> matches = userRepository.findByOauth2ProviderIdAndOauth2ProviderType(providerId, PROVIDER_TYPE);
        if (matches.size() > 1) {
            log.warn("Google provider id {} is linked to {} rows in the shared user table - picking the best usable one",
                    providerId, matches.size());
        }
        return matches.stream()
                .filter(u -> !Boolean.TRUE.equals(u.getDeleted()) && u.isEnabled())
                .filter(u -> loginIdentifierOf(u) != null)
                .min(Comparator.comparing(User::getId));
    }

    /**
     * What this user can be logged in and looked up as. SuperMeBE's User.email is nullable (45 live
     * accounts have none - phone-only registrations), so email alone would blow up both the
     * UserDetails and the "user" payload on /oauth2/token, which resolves the token subject back to
     * a user. Phone is the fallback because SupermeUserLookup resolves either.
     */
    public static String loginIdentifierOf(User user) {
        if (StringUtils.hasText(user.getEmail())) {
            return user.getEmail();
        }
        return StringUtils.hasText(user.getPhone()) ? user.getPhone() : null;
    }

    private void linkProviderIfNeeded(User user, String providerId, String pictureUrl) {
        boolean needsLink = !providerId.equals(user.getOauth2ProviderId())
                || !PROVIDER_TYPE.equals(user.getOauth2ProviderType())
                || (StringUtils.hasText(pictureUrl) && !pictureUrl.equals(user.getOauth2AvatarUrl()));
        if (!needsLink) {
            return;
        }
        if (!supermeProperties.isWritesEnabled()) {
            log.info("Google login for '{}' would link provider id {} but app.superme.writes-enabled is false - leaving the row untouched",
                    user.getEmail(), providerId);
            return;
        }
        user.setOauth2ProviderId(providerId);
        user.setOauth2ProviderType(PROVIDER_TYPE);
        if (StringUtils.hasText(pictureUrl)) {
            user.setOauth2AvatarUrl(pictureUrl);
        }
        userRepository.save(user);
        log.info("Linked Google provider id to existing account '{}'", user.getEmail());
    }
}
