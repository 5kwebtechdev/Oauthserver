package com.pkce.authserver.service;

import com.pkce.authserver.repository.CoinTransactionReasonRepository;
import com.pkce.authserver.repository.CoinTransactionRepository;
import com.pkce.authserver.repository.MasterCoinTransactionTypesRepository;
import com.pkce.authserver.superme.model.CoinTransaction;
import com.pkce.authserver.superme.model.CoinTransactionReason;
import com.pkce.authserver.superme.model.MasterCoinTransactionTypes;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Resolves a transaction's type/description into a coin_transaction_reason_id before saving,
 * mirroring SuperMeBE's own com.superme.service.CoinTransactionWriter - both DBs this server runs
 * against resolve a transaction's label this way now (see CoinTransaction.java's class comment).
 */
@Service
@RequiredArgsConstructor
public class CoinTransactionWriter {
    private final CoinTransactionRepository transactions;
    private final CoinTransactionReasonRepository reasons;
    private final MasterCoinTransactionTypesRepository types;

    @Transactional
    public CoinTransaction save(CoinTransaction transaction) {
        String type = transaction.getType();
        String description = transaction.getDescription();
        if (type == null || type.isBlank() || type.length() > 64) {
            throw new IllegalArgumentException("Coin transaction type must be 1 to 64 characters");
        }
        if (description == null || description.isBlank() || description.length() > 255) {
            throw new IllegalArgumentException("Coin transaction description must be 1 to 255 characters");
        }
        MasterCoinTransactionTypes masterType = types.findFirstByValueIgnoreCase(type)
                .orElseGet(() -> {
                    MasterCoinTransactionTypes created = new MasterCoinTransactionTypes();
                    created.setValue(type);
                    return types.save(created);
                });
        CoinTransactionReason reason = reasons.findFirstByTypeIdAndDescription(
                masterType.getTypeId(), description).orElseGet(() -> {
            CoinTransactionReason created = new CoinTransactionReason();
            created.setTypeId(masterType.getTypeId());
            created.setDescription(description);
            return reasons.save(created);
        });
        transaction.setCoinTransactionReasonId(reason.getCoinTransactionReasonId());
        return transactions.save(transaction);
    }
}
