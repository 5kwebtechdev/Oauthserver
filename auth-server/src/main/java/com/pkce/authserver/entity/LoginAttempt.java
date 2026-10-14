package com.pkce.authserver.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Brute-force lockout state, in a table this server owns.
 *
 * SuperMeBE's User table has no columns for any of this, and adding them would mean an ALTER on a
 * live 458-row production table that another application manages with ddl-auto=update. Keeping the
 * counters here instead leaves their schema untouched.
 *
 * The primary key is the SuperMeBE user id rather than a generated one: there is exactly one row
 * per user, and reusing their id avoids needing a lookup table between the two.
 */
@Entity
@Table(name = "auth_login_attempt")
@Getter
@Setter
@NoArgsConstructor
public class LoginAttempt {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "account_non_locked", nullable = false)
    private boolean accountNonLocked = true;

    /** Null = not locked. In the future = locked. In the past = lock expired, cleared lazily on next lookup. */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    public LoginAttempt(Long userId) {
        this.userId = userId;
    }
}
