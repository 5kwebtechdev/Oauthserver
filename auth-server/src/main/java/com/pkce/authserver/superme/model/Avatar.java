package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Copied verbatim from SuperMeBE (com.superme.model.Avatar). Maps the existing superme_db table -
 * this table was NOT touched by the User-normalization migration (confirmed via SHOW COLUMNS
 * against the live dev DB: plain bigint `id`, plain varchar `gender`, no avatar_id/gender_id).
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avatar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String avatarName;

    @Column
    private String gender;

    private String url;

    private String avatarImageName;

    @Column(nullable = false)
    private boolean renamedByUser = false;
}
