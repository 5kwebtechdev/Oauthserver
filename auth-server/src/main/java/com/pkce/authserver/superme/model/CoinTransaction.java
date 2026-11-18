package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * SuperMeBE's coin ledger (com.superme.model.CoinTransaction), carried over because registration
 * writes to it: a signup bonus of 10 coins, 500 for a PARENT, and 100 on each side of a referral.
 *
 * Confirmed via SHOW COLUMNS against the live dev DB: type/description are still real, NOT NULL
 * columns on this table (SuperMeBE's own newer model treats them as derived-only and resolves a
 * coin_transaction_reason_id instead, but that migration was never actually applied to this
 * table's `type`/`description` columns - they're still required and still the source of truth
 * here). coin_transaction_reason_id does exist but is nullable, so it's left unset.
 *
 * Only the columns this server's registration flow fills are mapped - their version also has
 * habit/task associations plus article/lesson/course/challenge/admin-action columns, all of which
 * belong to features this server has nothing to do with and all of which are nullable.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoinTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // User associated with the transaction

    @Column(nullable = false)
    private int amount; // Positive for earning, negative for spending

    @Column(nullable = false)
    private String type; // e.g. "FIRST_SIGNUP_BONUS", "REGISTRATION_BONUS", "REFERRAL_BONUS"

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private LocalDateTime timestamp; // Time of the transaction
}
