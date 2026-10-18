package com.pkce.authserver.admindev.model;

import com.pkce.authserver.superme.enums.Role;
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
 * Dev-schema counterpart of com.pkce.authserver.admin.model.Admin.
 *
 * This server is a single process that serves BOTH admin.supermeapp.com (prod admin client,
 * reading mindfullAdmin - see Admin.java) and devadmin.supermeapp.com (dev admin client).
 * Those are two genuinely different physical MySQL databases on two genuinely different
 * SuperMeBE deployments (prod mindfullAdmin vs dev's superme_db_admin) - a single Admin
 * entity/datasource pointed at one of them cannot correctly authenticate the other. Without
 * this, a password reset done against the dev SuperMeBE (which correctly updates
 * superme_db_admin) silently has no effect on login, because this server was still checking
 * the prod database's unchanged password hash.
 */
@Entity
@Getter
@Setter
public class AdminDev {

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
    private AdminDevAccountStatus status;

    @Column(name = "deleted", nullable = true)
    private Boolean deleted;

    private LocalDateTime expiryDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @OneToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "password_id")
    private AdminPasswordDev password;
}
