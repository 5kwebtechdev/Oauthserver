package com.pkce.authserver.supermedev.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

/**
 * Dev-schema counterpart of com.pkce.authserver.superme.model.UserPassword - see UserDev's
 * Javadoc. @Table is required here (unlike UserPassword.java) for the same reason: the real
 * table is named "UserPassword", not "UserPasswordDev".
 */
@Entity
@Table(name = "UserPassword")
@Getter
@Setter
public class UserPasswordDev {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private UserDev user;

    @Column(nullable = false)
    private String password;
}
