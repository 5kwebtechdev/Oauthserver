package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Reads SuperMeBE's live mindfullP1.User table. See SupermeUserLookup for how logins resolve an identifier. */
public interface SupermeUserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);

    Optional<User> findByUsername(String username);

    boolean existsByUsername(String username);

    Optional<User> findByReferralCodeIgnoreCase(String referralCode);

    /**
     * Returns a List, not an Optional, because these two columns carry no unique constraint and the
     * live data genuinely violates uniqueness: several Google subject ids are on two or three rows
     * each (one is on three), and there are duplicate APPLE ones too. An Optional-returning derived
     * query throws IncorrectResultSizeDataAccessException the moment it hits one of those, which
     * surfaced as a 500 on Google sign-in. GoogleLoginService picks a row deliberately instead.
     */
    List<User> findByOauth2ProviderIdAndOauth2ProviderType(String providerId, String providerType);
}
