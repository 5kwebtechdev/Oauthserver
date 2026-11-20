package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Copied verbatim from SuperMeBE (com.superme.model.Pet).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pet_id")
    private Integer id;

    @Column(nullable = false)
    private String petName;

    // Dead flat column on superapp_db's Pet (replaced by gender_id with a FK there, same as
    // Avatar.gender) - never read back anywhere in this codebase, so @Transient keeps the one
    // write site harmless instead of breaking strict validation against the live schema.
    @Transient
    private String gender;

    private String url;
}
