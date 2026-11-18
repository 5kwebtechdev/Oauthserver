package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.Family;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Reads/writes SuperMeBE's live mindfullP1.Family table during registration. */
public interface FamilyRepository extends JpaRepository<Family, Long> {

    Optional<Family> findByFamilyCode(String familyCode);

    boolean existsByFamilyCode(String familyCode);
}
