package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Mirrors SuperMeBE's com.superme.model.CoinTransactionReason. */
@Entity
@Table(name = "coin_transaction_reason")
@Getter
@Setter
@NoArgsConstructor
public class CoinTransactionReason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "coin_transaction_reason_id", nullable = false)
    private Integer coinTransactionReasonId;

    // TINYINT UNSIGNED on the live table, matching MasterCoinTransactionTypes.typeId.
    @Column(name = "type_id")
    private Byte typeId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "type_id", insertable = false, updatable = false)
    private MasterCoinTransactionTypes typeRef;

    @Column(name = "description", nullable = false, length = 255)
    private String description;
}
