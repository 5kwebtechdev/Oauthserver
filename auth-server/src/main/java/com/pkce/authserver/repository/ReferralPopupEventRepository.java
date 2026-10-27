package com.pkce.authserver.repository;

import com.pkce.authserver.entity.ReferralPopupEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralPopupEventRepository extends JpaRepository<ReferralPopupEvent, Long> {

    boolean existsByRecipientUserIdAndTypeAndRelatedUserId(
            Long recipientUserId, ReferralPopupEvent.Type type, Long relatedUserId);
}
