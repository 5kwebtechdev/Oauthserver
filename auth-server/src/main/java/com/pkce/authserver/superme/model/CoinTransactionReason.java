package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Copied from SuperMeBE (com.superme.model.CoinTransactionReason), minus its typeRef association
 * (a join-column-insertable=false mirror of typeId) since nothing here reads it back - the
 * reason/type ids are only ever resolved-or-created and stored on CoinTransaction.
 */
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

    @Column(name = "type_id")
    private Integer typeId;

    @Column(name = "description", nullable = false, length = 255)
    private String description;
}
