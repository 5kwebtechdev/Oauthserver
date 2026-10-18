package com.pkce.authserver.supermedev.repository;

import com.pkce.authserver.supermedev.model.UserDev;
import com.pkce.authserver.supermedev.model.UserPasswordDev;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserPasswordDevRepository extends JpaRepository<UserPasswordDev, Long> {

    Optional<UserPasswordDev> findByUser(UserDev user);
}
