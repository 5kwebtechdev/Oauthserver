package com.pkce.authserver.entity;

import com.pkce.authserver.superme.model.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** Pending referral bonus notification returned to the referrer on their next login. */
@Entity
@Table(name = "referral_reward")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReferralReward {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "referrer_id", nullable = false)
    private User referrer;

    @Column(name = "referred_user_id")
    private Long referredUserId;

    @Column(name = "referred_user_name")
    private String referredUserName;

    @Column(name = "coins", nullable = false)
    private int coins;

    @Column(name = "notified", nullable = false)
    @Builder.Default
    private boolean notified = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "notified_at")
    private LocalDateTime notifiedAt;
}
