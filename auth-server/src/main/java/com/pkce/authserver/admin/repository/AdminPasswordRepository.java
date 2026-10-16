package com.pkce.authserver.admin.repository;

import com.pkce.authserver.admin.model.AdminPassword;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AdminPasswordRepository extends JpaRepository<AdminPassword, Long> {
}
