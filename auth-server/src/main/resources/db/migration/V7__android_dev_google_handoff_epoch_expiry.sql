-- Compare short-lived Android handoff expiry using Unix milliseconds so JDBC/MySQL
-- session timezone conversions cannot make a fresh transaction appear expired.
ALTER TABLE android_dev_google_handoff
    ADD COLUMN expires_at_epoch_ms BIGINT NULL;
