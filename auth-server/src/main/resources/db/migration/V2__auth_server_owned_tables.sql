-- Every table this authorization server owns, and nothing else.
--
-- This runs inside mindfullP1, SuperMeBE's live schema, which has ~190 tables managed entirely by
-- their Hibernate ddl-auto=update and no flyway_schema_history of its own. Two consequences shape
-- this file:
--
--   * Nothing here may touch a table SuperMeBE owns. User, UserPassword, Family, Avatar and Pet are
--     read through JPA (see com.pkce.authserver.superme.model) and never created, altered or
--     dropped from a migration. Users live in their User table now, so the old app_user / role /
--     app_user_role tables are gone rather than created - which also sidesteps the one name
--     collision in that schema, a stale 1-row app_user table belonging to neither app.
--
--   * Flyway is configured with baseline-on-migrate, so against a schema with no history table it
--     records a baseline at V1 and starts applying from V2 - hence this being V2 and there being no
--     V1. CREATE TABLE IF NOT EXISTS keeps it idempotent either way: a re-run, or a deployment
--     pointed at a schema where some of these already exist, is a no-op instead of a failure.
--
-- The previous V1-V9 set was written against the throwaway pkce_auth dev schema and is not carried
-- forward; its only unique content was the app_user tables that no longer exist and demo seed rows
-- that must never be inserted into production.

-- Standard Spring Authorization Server JDBC schema (MySQL dialect).
-- See: org.springframework.security.oauth2.server.authorization.client.JdbcRegisteredClientRepository
--      org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationService
--      org.springframework.security.oauth2.server.authorization.JdbcOAuth2AuthorizationConsentService

CREATE TABLE IF NOT EXISTS oauth2_registered_client (
    id                              VARCHAR(100)  NOT NULL,
    client_id                       VARCHAR(100)  NOT NULL,
    client_id_issued_at             DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    client_secret                   VARCHAR(200)  DEFAULT NULL,
    client_secret_expires_at        DATETIME      DEFAULT NULL,
    client_name                     VARCHAR(200)  NOT NULL,
    client_authentication_methods   VARCHAR(1000) NOT NULL,
    authorization_grant_types       VARCHAR(1000) NOT NULL,
    redirect_uris                   VARCHAR(1000) DEFAULT NULL,
    post_logout_redirect_uris       VARCHAR(1000) DEFAULT NULL,
    scopes                          VARCHAR(1000) NOT NULL,
    client_settings                 VARCHAR(2000) NOT NULL,
    token_settings                  VARCHAR(2000) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_oauth2_registered_client_client_id (client_id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS oauth2_authorization (
    id                              VARCHAR(100)  NOT NULL,
    registered_client_id            VARCHAR(100)  NOT NULL,
    principal_name                  VARCHAR(200)  NOT NULL,
    authorization_grant_type        VARCHAR(100)  NOT NULL,
    authorized_scopes               VARCHAR(1000) DEFAULT NULL,
    attributes                      BLOB          DEFAULT NULL,
    state                           VARCHAR(500)  DEFAULT NULL,

    authorization_code_value        BLOB          DEFAULT NULL,
    authorization_code_issued_at    DATETIME      DEFAULT NULL,
    authorization_code_expires_at   DATETIME      DEFAULT NULL,
    authorization_code_metadata     BLOB          DEFAULT NULL,

    access_token_value              BLOB          DEFAULT NULL,
    access_token_issued_at          DATETIME      DEFAULT NULL,
    access_token_expires_at         DATETIME      DEFAULT NULL,
    access_token_metadata           BLOB          DEFAULT NULL,
    access_token_type               VARCHAR(100)  DEFAULT NULL,
    access_token_scopes             VARCHAR(1000) DEFAULT NULL,

    oidc_id_token_value             BLOB          DEFAULT NULL,
    oidc_id_token_issued_at         DATETIME      DEFAULT NULL,
    oidc_id_token_expires_at        DATETIME      DEFAULT NULL,
    oidc_id_token_metadata          BLOB          DEFAULT NULL,

    refresh_token_value             BLOB          DEFAULT NULL,
    refresh_token_issued_at         DATETIME      DEFAULT NULL,
    refresh_token_expires_at        DATETIME      DEFAULT NULL,
    refresh_token_metadata          BLOB          DEFAULT NULL,

    user_code_value                 BLOB          DEFAULT NULL,
    user_code_issued_at             DATETIME      DEFAULT NULL,
    user_code_expires_at            DATETIME      DEFAULT NULL,
    user_code_metadata              BLOB          DEFAULT NULL,

    device_code_value               BLOB          DEFAULT NULL,
    device_code_issued_at           DATETIME      DEFAULT NULL,
    device_code_expires_at          DATETIME      DEFAULT NULL,
    device_code_metadata            BLOB          DEFAULT NULL,

    PRIMARY KEY (id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS oauth2_authorization_consent (
    registered_client_id  VARCHAR(100)  NOT NULL,
    principal_name        VARCHAR(200)  NOT NULL,
    authorities           VARCHAR(1000) NOT NULL,
    PRIMARY KEY (registered_client_id, principal_name)
) ENGINE = InnoDB;

-- Audit table backing ReuseDetectingAuthorizationService: records the hash of every
-- refresh token value that gets superseded by rotation, so a later replay of that
-- exact (dead) token can be detected and the whole authorization revoked.
CREATE TABLE IF NOT EXISTS refresh_token_history (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    authorization_id VARCHAR(100) NOT NULL,
    token_hash       VARCHAR(64)  NOT NULL,
    superseded_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_refresh_token_history_hash (token_hash),
    KEY idx_refresh_token_history_auth_id (authorization_id)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS otp_code (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    purpose    VARCHAR(40)  NOT NULL,
    email      VARCHAR(255) NOT NULL,
    code_hash  VARCHAR(64)  NOT NULL,
    expires_at DATETIME     NOT NULL,
    attempts   INT          NOT NULL DEFAULT 0,
    consumed   TINYINT(1)   NOT NULL DEFAULT 0,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_otp_code_lookup (purpose, email, consumed)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS security_event (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    event_type VARCHAR(40)  NOT NULL,
    identifier VARCHAR(255) DEFAULT NULL,
    ip_address VARCHAR(64)  DEFAULT NULL,
    details    VARCHAR(500) DEFAULT NULL,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_security_event_type_created (event_type, created_at)
) ENGINE = InnoDB;

-- Brute-force lockout counters. These used to be columns on our own app_user table; SuperMeBE's
-- User table has no equivalent and must not be altered, so they live here instead, keyed by their
-- user id. No foreign key to User on purpose: this table is ours, that one is theirs, and a FK
-- would make our migration depend on the shape of a table another application reshapes at will.
CREATE TABLE IF NOT EXISTS auth_login_attempt (
    user_id            BIGINT     NOT NULL,
    failed_attempts    INT        NOT NULL DEFAULT 0,
    account_non_locked TINYINT(1) NOT NULL DEFAULT 1,
    locked_until       DATETIME   DEFAULT NULL,
    PRIMARY KEY (user_id)
) ENGINE = InnoDB;
