package com.pkce.authserver.service;

import com.pkce.authserver.repository.CoinTransactionRepository;
import com.pkce.authserver.superme.model.CoinTransaction;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Thin wrapper so UserRegistrationService doesn't depend on CoinTransactionRepository directly.
 *
 * Confirmed via SHOW COLUMNS against the live dev DB: coin_transaction's type/description columns
 * are still real and NOT NULL (unlike SuperMeBE's own newer model, which treats them as
 * derived-only via a coin_transaction_reason_id lookup - that part of the migration was never
 * applied to this table), so a plain save of type/description is correct and sufficient here.
 */
@Service
@RequiredArgsConstructor
public class CoinTransactionWriter {
    private final CoinTransactionRepository transactions;

    @Transactional
    public CoinTransaction save(CoinTransaction transaction) {
        return transactions.save(transaction);
    }
}
