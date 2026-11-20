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
 * Mirrors SuperMeBE's com.superme.model.MasterCoinTransactionTypes.
 *
 * Byte, not Integer like SuperMeBE's own (unused-elsewhere) declaration: type_id is actually
 * TINYINT UNSIGNED on the live table - SuperMeBE's ddl-auto=update never surfaces the mismatch,
 * this server's ddl-auto=validate does.
 */
@Entity
@Table(name = "master_coin_transaction_types")
@Getter
@Setter
@NoArgsConstructor
public class MasterCoinTransactionTypes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "type_id", nullable = false)
    private Byte typeId;

    @Column(name = "value", nullable = false, length = 64)
    private String value;
}
