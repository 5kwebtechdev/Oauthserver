-- The business backend reads these two tables to deliver referral notifications and home popups.
-- Keep the column names and uniqueness contract aligned with SuperMeBE's corresponding entities.
CREATE TABLE IF NOT EXISTS referral_reward (
    id BIGINT NOT NULL AUTO_INCREMENT,
    referrer_id BIGINT NOT NULL,
    referred_user_id BIGINT DEFAULT NULL,
    referred_user_name VARCHAR(255) DEFAULT NULL,
    coins INT NOT NULL,
    notified TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    notified_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    KEY idx_referral_reward_referrer_notified_created (referrer_id, notified, created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS referral_popup_event (
    id BIGINT NOT NULL AUTO_INCREMENT,
    event_id VARCHAR(36) NOT NULL,
    recipient_user_id BIGINT NOT NULL,
    type VARCHAR(32) NOT NULL,
    related_user_id BIGINT NOT NULL,
    amount INT NOT NULL,
    both_rewarded TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL,
    acknowledged_at DATETIME DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_referral_popup_event_id (event_id),
    UNIQUE KEY uk_referral_popup_recipient_type_related (recipient_user_id, type, related_user_id),
    KEY idx_referral_popup_recipient_ack (recipient_user_id, acknowledged_at)
) ENGINE=InnoDB;
