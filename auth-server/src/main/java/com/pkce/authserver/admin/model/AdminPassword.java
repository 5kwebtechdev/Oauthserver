package com.pkce.authserver.admin.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Copied field-for-field from SuperMeBE's com.superme.admin.model.AdminPassword so this
 * authorization server can verify admin-panel credentials against the one real
 * mindfullAdmin.AdminPassword table instead of inventing its own. Read-only here: this
 * server never writes to the admin schema.
 */
@Entity
@Getter
@Setter
public class AdminPassword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String hashedPassword;
    private LocalDateTime createdAt;
    private Boolean active;
}
