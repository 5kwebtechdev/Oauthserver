package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Reads SuperMeBE's live mindfullP1.UserPassword table - a user's BCrypt hash lives there, not on User. */
public interface UserPasswordRepository extends JpaRepository<UserPassword, Long> {

    Optional<UserPassword> findByUser(User user);
}
