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
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * SuperMeBE's coin ledger (com.superme.model.CoinTransaction), carried over because registration
 * writes to it: a signup bonus of 10 coins, 500 for a PARENT, and 100 on each side of a referral.
 *
 * type/description are @Transient here, mirroring SuperMeBE's own current model: both DBs this
 * server runs against (superme_db and superapp_db) resolve a transaction's label through
 * coin_transaction_reason_id instead - superapp_db dropped the flat type/description columns
 * entirely (NOT NULL FK there), while superme_db kept them only as unused legacy columns nothing
 * reads back (SuperMeBE's own CoinTransactionWriter stopped writing them for the same reason).
 * CoinTransactionWriter resolves/creates the MasterCoinTransactionTypes + CoinTransactionReason
 * rows and sets coinTransactionReasonId before saving, exactly like SuperMeBE's version; the
 * getters below just let existing callers keep reading getType()/getDescription() after a reload.
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

    @Transient
    @Getter(AccessLevel.NONE)
    private String type; // e.g. "FIRST_SIGNUP_BONUS", "REGISTRATION_BONUS", "REFERRAL_BONUS"

    @Transient
    @Getter(AccessLevel.NONE)
    private String description;

    @Column(name = "coin_transaction_reason_id")
    private Integer coinTransactionReasonId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "coin_transaction_reason_id", insertable = false, updatable = false)
    private CoinTransactionReason reasonRef;

    @Column(nullable = false)
    private LocalDateTime timestamp; // Time of the transaction

    public String getType() {
        return type != null ? type
                : reasonRef == null || reasonRef.getTypeRef() == null ? null : reasonRef.getTypeRef().getValue();
    }

    public String getDescription() {
        return description != null ? description : reasonRef == null ? null : reasonRef.getDescription();
    }
}
