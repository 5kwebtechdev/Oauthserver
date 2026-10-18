package com.pkce.authserver.admindev.repository;

import com.pkce.authserver.admindev.model.AdminPasswordDev;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminPasswordDevRepository extends JpaRepository<AdminPasswordDev, Long> {
}
