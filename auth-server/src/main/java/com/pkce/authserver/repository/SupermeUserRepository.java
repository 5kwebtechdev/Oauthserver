package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Reads SuperMeBE's live superapp_db.User table. See SupermeUserLookup for how logins resolve an identifier. */
public interface SupermeUserRepository extends JpaRepository<User, Integer> {

    // email/phone/username live on user_profile only, read through User.profileRef (see its
    // comment for why that's a lazy association rather than a @SecondaryTable column). JPQL,
    // not native SQL: navigating an association in the WHERE clause lets Hibernate generate its
    // own correct join/select, instead of a hand-written native query needing to list - and keep
    // in sync - every column of every secondary table User still maps (role_id, last_active_time,
    // the user_auth/user_streak/user_onboarding/user_referrals/user_wallet columns, ...) just to
    // hydrate the entity, which a native query's result set would otherwise be missing.
    @Query("SELECT u FROM User u WHERE u.profileRef.email = :email")
    Optional<User> findByEmail(@Param("email") String email);

    @Query("SELECT u FROM User u WHERE u.profileRef.phone = :phone")
    Optional<User> findByPhone(@Param("phone") String phone);

    @Query("SELECT u FROM User u WHERE u.profileRef.username = :username")
    Optional<User> findByUsername(@Param("username") String username);

    @Query("SELECT COUNT(u) > 0 FROM User u WHERE u.profileRef.username = :username")
    boolean existsByUsername(@Param("username") String username);

    // referralCode/usedReferralCode are real (non-Transient) columns on user_referrals, so this
    // is a normal derived/JPQL path - unlike email/phone/username above, no association needed.
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
