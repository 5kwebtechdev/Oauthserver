package com.pkce.authserver.superme.model;

import com.pkce.authserver.superme.enums.Relationship;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Copied from SuperMeBE (com.superme.model.FamilyMember). Registration writes one of these for any
 * user who joins or creates a family, and their own code counts rows here to enforce the
 * two-children / two-parents-per-family limits, so a registration that skipped it would let those
 * limits be exceeded.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FamilyMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    private Family family;

    @ManyToOne(optional = false)
    private User user;

    @Column(nullable = false)
    private LocalDate dateOfBirth;

    public boolean isChild() {
        return user != null && user.getRelationship() == Relationship.CHILD;
    }

    public boolean isParent() {
        return user != null && user.getRelationship() == Relationship.PARENT;
    }

    public boolean isSelf() {
        return user != null && user.getRelationship() == Relationship.SELF;
    }
}
