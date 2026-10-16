package com.pkce.authserver.admin.repository;

import com.pkce.authserver.admin.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Read-only lookup against mindfullAdmin.Admin for admin-panel login. Only the
 * identifier lookups login needs - no admin-management CRUD, that stays in SuperMeBE.
 */
@Repository
public interface AdminRepository extends JpaRepository<Admin, Long> {

    Optional<Admin> findByEmail(String email);

    Optional<Admin> findByPhone(String phone);
}
