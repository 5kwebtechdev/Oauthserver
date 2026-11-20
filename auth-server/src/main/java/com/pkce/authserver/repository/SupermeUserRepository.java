package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/** Reads SuperMeBE's live mindfullP1.User table. See SupermeUserLookup for how logins resolve an identifier. */
public interface SupermeUserRepository extends JpaRepository<User, Integer> {

    // email/phone/username moved off the flat User columns onto user_profile when SuperMeBE's own
    // app adopted the new schema (see UserRegistrationService.syncUserProfile); a signup made since
    // then has these fields set ONLY on user_profile, with User's own columns left null. Every
    // legacy row that still has the flat column also has the matching (or newer) user_profile value
    // (verified against the live data before this change), so COALESCE(profile, flat) is a strict
    // superset of the old derived-query behavior - it still matches a row that, for whatever reason,
    // only ever had the flat column (e.g. a user_profile-less fixture in a test).
    // Entity-returning native queries must also join user_access/user_module_links: User maps
    // role_id/avatar_id/pet_id from those secondary tables, and Hibernate needs every mapped
    // column present in the result set to hydrate the entity, even from a native query.
    @Query(value = "SELECT u.*, ua.role_id, uml.avatar_id, uml.pet_id FROM User u " +
            "LEFT JOIN user_profile up ON up.user_id = u.user_id " +
            "LEFT JOIN user_access ua ON ua.user_id = u.user_id " +
            "LEFT JOIN user_module_links uml ON uml.user_id = u.user_id " +
            "WHERE COALESCE(up.email, u.email) = :email", nativeQuery = true)
    Optional<User> findByEmail(@Param("email") String email);

    @Query(value = "SELECT u.*, ua.role_id, uml.avatar_id, uml.pet_id FROM User u " +
            "LEFT JOIN user_profile up ON up.user_id = u.user_id " +
            "LEFT JOIN user_access ua ON ua.user_id = u.user_id " +
            "LEFT JOIN user_module_links uml ON uml.user_id = u.user_id " +
            "WHERE COALESCE(up.phone, u.phone) = :phone", nativeQuery = true)
    Optional<User> findByPhone(@Param("phone") String phone);

    @Query(value = "SELECT u.*, ua.role_id, uml.avatar_id, uml.pet_id FROM User u " +
            "LEFT JOIN user_profile up ON up.user_id = u.user_id " +
            "LEFT JOIN user_access ua ON ua.user_id = u.user_id " +
            "LEFT JOIN user_module_links uml ON uml.user_id = u.user_id " +
            "WHERE COALESCE(up.username, u.username) = :username", nativeQuery = true)
    Optional<User> findByUsername(@Param("username") String username);

    @Query(value = "SELECT COUNT(*) > 0 FROM User u LEFT JOIN user_profile up ON up.user_id = u.user_id WHERE COALESCE(up.username, u.username) = :username", nativeQuery = true)
    boolean existsByUsername(@Param("username") String username);

    // referralCode/usedReferralCode moved to user_referrals the same way.
    @Query(value = "SELECT u.*, ua.role_id, uml.avatar_id, uml.pet_id FROM User u " +
            "LEFT JOIN user_referrals ur ON ur.user_id = u.user_id " +
            "LEFT JOIN user_access ua ON ua.user_id = u.user_id " +
            "LEFT JOIN user_module_links uml ON uml.user_id = u.user_id " +
            "WHERE UPPER(COALESCE(ur.referralCode, u.referralCode)) = UPPER(:referralCode)", nativeQuery = true)
    Optional<User> findByReferralCodeIgnoreCase(@Param("referralCode") String referralCode);

    /**
     * Returns a List, not an Optional, because these two columns carry no unique constraint and the
     * live data genuinely violates uniqueness: several Google subject ids are on two or three rows
     * each (one is on three), and there are duplicate APPLE ones too. An Optional-returning derived
     * query throws IncorrectResultSizeDataAccessException the moment it hits one of those, which
     * surfaced as a 500 on Google sign-in. GoogleLoginService picks a row deliberately instead.
     */
    List<User> findByOauth2ProviderIdAndOauth2ProviderType(String providerId, String providerType);
}
