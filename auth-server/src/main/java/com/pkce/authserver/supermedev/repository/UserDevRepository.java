package com.pkce.authserver.supermedev.repository;

import com.pkce.authserver.superme.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/**
 * Reads the SAME User entity class prod uses (com.pkce.authserver.superme.model.User), just
 * through a second EntityManagerFactory pointed at SuperMeBE's dev database (superme_db) - see
 * PrimaryDevDataSourceConfig. A JPA entity is not permanently bound to one persistence unit;
 * scanning it from two independent EntityManagerFactory beans against two different DataSources
 * is standard and gives this dev lookup the full User shape (name, family, avatar, pet, coins,
 * onboardingStep, ...) that UserInfoAccessTokenResponseCustomizer's "user" token payload needs -
 * a slim duplicate entity (the earlier approach here) could only support login, not that payload.
 */
public interface UserDevRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByPhone(String phone);
}
