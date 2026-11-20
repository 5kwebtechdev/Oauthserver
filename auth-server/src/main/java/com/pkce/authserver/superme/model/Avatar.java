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
 * Copied verbatim from SuperMeBE (com.superme.model.Avatar).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avatar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "avatar_id")
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String avatarName;

    // Dead flat column on superme_db (already replaced by gender_id there) and gone entirely on
    // superapp_db's Avatar (gender_id with a FK is the only form it takes now) - never read back
    // anywhere in this codebase, so @Transient keeps the one write site harmless on both schemas
    // instead of breaking strict validation against whichever DB doesn't have the column.
    @Transient
    private String gender;

    private String url;

    private String avatarImageName;

    @Column(nullable = false)
    private boolean renamedByUser = false;
}
