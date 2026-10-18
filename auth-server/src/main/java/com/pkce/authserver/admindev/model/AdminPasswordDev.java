package com.pkce.authserver.admindev.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Dev-schema counterpart of com.pkce.authserver.admin.model.AdminPassword - reads SuperMeBE's
 * DEV admin-panel database (e.g. superme_db_admin) instead of the prod one (mindfullAdmin).
 * A real, separate physical database on a real, separate SuperMeBE deployment (superme-dev),
 * not just a different schema name - see AdminDevDataSourceConfig for why this needs its own
 * JPA persistence unit rather than reusing the prod Admin/AdminPassword entities.
 *
 * @Table is required here (unlike AdminPassword.java): the real table in both databases is
 * named "AdminPassword" - Hibernate otherwise defaults to the Java class name
 * ("AdminPasswordDev"), which exists nowhere.
 */
@Entity
@Table(name = "AdminPassword")
@Getter
@Setter
public class AdminPasswordDev {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String hashedPassword;
    private LocalDateTime createdAt;
    private Boolean active;
}
