-- Enforce the new maximum lifetimes for OAuth tokens that were persisted before
-- RegisteredClientTokenSettingsUpdater applies the settings at application startup.
UPDATE oauth2_authorization
SET access_token_expires_at = LEAST(
        access_token_expires_at,
        TIMESTAMPADD(MINUTE, 45, access_token_issued_at)
)
WHERE access_token_issued_at IS NOT NULL
  AND access_token_expires_at IS NOT NULL
  AND access_token_expires_at > TIMESTAMPADD(MINUTE, 45, access_token_issued_at);

UPDATE oauth2_authorization
SET refresh_token_expires_at = LEAST(
        refresh_token_expires_at,
        TIMESTAMPADD(MINUTE, 90, refresh_token_issued_at)
)
WHERE refresh_token_issued_at IS NOT NULL
  AND refresh_token_expires_at IS NOT NULL
  AND refresh_token_expires_at > TIMESTAMPADD(MINUTE, 90, refresh_token_issued_at);
