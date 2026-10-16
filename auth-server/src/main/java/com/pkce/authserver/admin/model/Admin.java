package com.pkce.authserver.admin.model;

import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Copied field-for-field from SuperMeBE's com.superme.admin.model.Admin so this
 * authorization server reads the one real admin-staff table (mindfullAdmin.Admin)
 * instead of inventing its own. ddl-auto is validate for this entity manager (see
 * AdminDataSourceConfig) - SuperMeBE owns schema changes to this table, not this server.
 *
 * AdminStatus is copied as a plain local enum (AdminAccountStatus) rather than pulling in
 * SuperMeBE's whole enums package; only the two values this server reads are needed.
 */
@Entity
@Getter
@Setter
public class Admin {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String fullName;
    private String email;
    private String phone;

    @Column(nullable = false)
    private String department;

    private String designation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AdminAccountStatus status;

    @Column(name = "deleted", nullable = true)
    private Boolean deleted;

    private LocalDateTime expiryDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToOne(fetch = FetchType.EAGER, cascade = CascadeType.NONE)
    @JoinColumn(name = "password_id")
    private AdminPassword password;
}
