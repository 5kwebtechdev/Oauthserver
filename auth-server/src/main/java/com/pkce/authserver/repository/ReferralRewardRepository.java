package com.pkce.authserver.repository;

import com.pkce.authserver.entity.ReferralReward;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralRewardRepository extends JpaRepository<ReferralReward, Long> {
}
