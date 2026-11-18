package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Copied from SuperMeBE (com.superme.model.UserPassword) - the BCrypt hash lives in its own
 * table, not on User. Users without a row here (social-login or incomplete onboarding) must be
 * treated by SupermeUserDetailsService as bad credentials, not a crash.
 */
@Entity
@Table(name = "UserPassword")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserPassword {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "password", nullable = false, length = 255)
    private String password;
}
