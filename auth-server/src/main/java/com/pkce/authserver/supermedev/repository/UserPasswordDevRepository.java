package com.pkce.authserver.supermedev.repository;

import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Dev-datasource counterpart of UserPasswordRepository - see UserDevRepository's Javadoc. */
public interface UserPasswordDevRepository extends JpaRepository<UserPassword, Long> {

    Optional<UserPassword> findByUser(User user);
}
