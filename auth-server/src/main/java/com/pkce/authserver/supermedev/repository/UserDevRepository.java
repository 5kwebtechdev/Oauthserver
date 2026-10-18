package com.pkce.authserver.supermedev.repository;

import com.pkce.authserver.supermedev.model.UserDev;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserDevRepository extends JpaRepository<UserDev, Long> {

    Optional<UserDev> findByEmail(String email);

    Optional<UserDev> findByPhone(String phone);
}
