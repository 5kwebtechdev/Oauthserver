package com.pkce.authserver.supermedev.model;

import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Dev-schema counterpart of com.pkce.authserver.superme.model.User - SuperMeBE's dev deployment
 * (superme-dev) uses a genuinely separate physical database (superme_db) from prod (mindfullP1),
 * same situation AdminDev/AdminDataSourceConfig already solved for the admin tables. Without
 * this, logins from a dev client (e.g. the APK dev build) resolved against PROD's User table,
 * while every business-API call the app itself makes afterward hits devapis.supermeapp.com's
 * superme_db - a different account entirely, which the dev backend then sees as having
 * incomplete/no onboarding, routing a perfectly real login straight back into the signup wizard.
 *
 * Deliberately NOT a field-for-field copy of the real 63-column User entity - only the columns
 * authentication actually needs (identifier lookup + password hash + account status) are mapped.
 * JPA entities are not required to map every column of their table, and the real User entity
 * already carries the full shape (and its Family/Avatar/Pet relationship graph) for everywhere
 * else in this app that needs it; duplicating all of that here would be a second, higher-risk
 * entity to keep in sync for zero benefit to login.
 *
 * @Table is required (unlike User.java): the real table is named "User" - Hibernate otherwise
 * defaults to the Java class name ("UserDev"), which exists nowhere. (User.java itself avoids
 * @Table only because "User" is also its literal class name.)
 */
@Entity
@Table(name = "User")
@Getter
@Setter
public class UserDev {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String email;

    @Column(unique = true)
    private String phone;

    @Column(name = "deleted")
    private Boolean deleted;

    @Column(nullable = false)
    private boolean enabled;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;
}
