package com.pkce.authserver.repository;

import com.pkce.authserver.entity.ReferralPopupEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralPopupEventRepository extends JpaRepository<ReferralPopupEvent, Integer> {

    boolean existsByRecipientUserIdAndTypeAndRelatedUserId(
            Integer recipientUserId, ReferralPopupEvent.Type type, Integer relatedUserId);
}
