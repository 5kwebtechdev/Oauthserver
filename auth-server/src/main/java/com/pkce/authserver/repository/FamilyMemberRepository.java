package com.pkce.authserver.repository;

import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.Family;
import com.pkce.authserver.superme.model.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Long> {

    /**
     * Backs SuperMeBE's two-children / two-parents-per-family limits. The relationship lives on
     * User, not on FamilyMember, so this counts through the association exactly as their
     * countByRelationship does.
     */
    @Query("SELECT COUNT(m) FROM FamilyMember m WHERE m.family = :family AND m.user.relationship = :relationship")
    long countByRelationship(@Param("family") Family family, @Param("relationship") Relationship relationship);
}
