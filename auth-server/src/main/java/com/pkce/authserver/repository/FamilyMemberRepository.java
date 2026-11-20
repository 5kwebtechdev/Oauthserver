package com.pkce.authserver.repository;

import com.pkce.authserver.superme.converter.UserRelationshipIdConverter;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.Family;
import com.pkce.authserver.superme.model.FamilyMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FamilyMemberRepository extends JpaRepository<FamilyMember, Integer> {

    /**
     * Backs SuperMeBE's two-children / two-parents-per-family limits. relationship_id lives in
     * user_profile (read via User.profileRef - see the comment on User.relationship for why it
     * can't be a normal JPQL path), so this joins through that association instead.
     */
    @Query("SELECT COUNT(m) FROM FamilyMember m WHERE m.family = :family AND m.user.profileRef.relationshipId = :relationshipId")
    long countByRelationshipId(@Param("family") Family family, @Param("relationshipId") Integer relationshipId);

    default long countByRelationship(Family family, Relationship relationship) {
        Byte id = new UserRelationshipIdConverter().convertToDatabaseColumn(relationship);
        return countByRelationshipId(family, id == null ? null : id.intValue());
    }
}
