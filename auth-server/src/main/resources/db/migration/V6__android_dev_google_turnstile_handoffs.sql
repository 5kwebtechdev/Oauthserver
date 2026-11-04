CREATE TABLE android_dev_google_handoff (
    token_hash CHAR(64) NOT NULL,
    purpose VARCHAR(16) NOT NULL,
    client_id VARCHAR(100) NOT NULL,
    redirect_uri VARCHAR(500) NOT NULL,
    code_challenge VARCHAR(128) NOT NULL,
    google_nonce VARCHAR(128) NOT NULL,
    oidc_nonce VARCHAR(128) NOT NULL,
    state_value VARCHAR(128) NOT NULL,
    expires_at TIMESTAMP(6) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL,
    consumed_at TIMESTAMP(6) NULL,
    PRIMARY KEY (token_hash),
    INDEX idx_android_google_handoff_expiry (expires_at)
);
