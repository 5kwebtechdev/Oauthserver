package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Copied verbatim from SuperMeBE (com.superme.model.UserPassword) - the BCrypt hash lives in its
 * own table, not on User. 327 of the 458 live users have a row here; the rest (social-login or
 * incomplete onboarding) have none, which SupermeUserDetailsService must treat as bad credentials
 * rather than a crash, exactly as their UserService.login does.
 */
@Entity
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

    @Column(nullable = false)
    private String password;
}
