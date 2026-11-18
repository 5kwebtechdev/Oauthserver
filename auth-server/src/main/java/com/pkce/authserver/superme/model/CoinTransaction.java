package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * SuperMeBE's coin ledger (com.superme.model.CoinTransaction), carried over because registration
 * writes to it: a signup bonus of 10 coins, 500 for a PARENT, and 100 on each side of a referral.
 *
 * New DB: type/description are no longer plain columns - they are @Transient and resolved through
 * coinTransactionReasonId -> coin_transaction_reason -> master_coin_transaction_types, exactly as
 * in SuperMeBE. CoinTransactionWriter (in service) resolves-or-creates that reason row and sets
 * coinTransactionReasonId before the actual insert; callers must go through it rather than saving
 * a CoinTransaction built with only type/description set, which would leave
 * coinTransactionReasonId null and violate the NOT NULL column.
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
    @Column(name = "coin_transaction_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // User associated with the transaction

    @Column(nullable = false)
    private int amount; // Positive for earning, negative for spending

    // New DB keeps transaction labels in coin_transaction_reason and its type master.
    @Transient
    private String type; // e.g. "FIRST_SIGNUP_BONUS", "REGISTRATION_BONUS", "REFERRAL_BONUS"

    @Transient
    private String description;

    @Column(name = "coin_transaction_reason_id", nullable = false)
    private Integer coinTransactionReasonId;

    @Column(nullable = false)
    private LocalDateTime timestamp; // Time of the transaction
}
