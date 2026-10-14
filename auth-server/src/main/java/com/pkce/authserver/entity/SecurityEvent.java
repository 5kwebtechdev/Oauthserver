package com.pkce.authserver.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * An append-only record of security-relevant events - failed logins, account lockouts,
 * OTP verify failures, rate-limit trips - so there's an actual queryable record instead
 * of just scattered log lines. Visible via GET /api/admin/security-events (ROLE_ADMIN).
 */
@Entity
@Table(name = "security_event")
@Getter
@Setter
@NoArgsConstructor
public class SecurityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_type", nullable = false)
    private String eventType;

    /** Username, email, or whatever identifies the subject - not always a real account (e.g. a guessed username). */
    private String identifier;

    @Column(name = "ip_address")
    private String ipAddress;

    private String details;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}
