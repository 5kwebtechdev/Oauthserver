package com.pkce.authserver.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** One pending, dismissible referral home-popup per recipient. */
@Entity
@Table(name = "referral_popup_event",
        uniqueConstraints = @UniqueConstraint(name = "uk_referral_popup_recipient_type_related",
                columnNames = {"recipient_user_id", "type", "related_user_id"}),
        indexes = @Index(name = "idx_referral_popup_recipient_ack",
                columnList = "recipient_user_id, acknowledged_at"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralPopupEvent {

    public enum Type { REFERRAL_RECEIVED, REFERRAL_JOINED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false, unique = true, length = 36)
    private String eventId;

    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private Type type;

    @Column(name = "related_user_id", nullable = false)
    private Long relatedUserId;

    @Column(name = "amount", nullable = false)
    private int amount;

    @Column(name = "both_rewarded", nullable = false)
    private boolean bothRewarded;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;
}
