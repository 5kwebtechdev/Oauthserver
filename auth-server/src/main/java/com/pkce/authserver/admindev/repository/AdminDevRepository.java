package com.pkce.authserver.admindev.repository;

import com.pkce.authserver.admindev.model.AdminDev;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminDevRepository extends JpaRepository<AdminDev, Long> {

    Optional<AdminDev> findByEmail(String email);

    Optional<AdminDev> findByPhone(String phone);
}
