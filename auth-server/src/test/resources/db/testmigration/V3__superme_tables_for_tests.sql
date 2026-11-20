-- Stand-ins for the SuperMeBE tables this server reads but does not own.
--
-- In production these already exist in superme_db, created and maintained by SuperMeBE's own
-- Hibernate ddl-auto=update, and V2 deliberately does not create them - a migration of ours must
-- never define the shape of another application's tables. Tests still need somewhere for the
-- ported entities to read and write, so this file recreates them in H2, and it lives under
-- src/test/resources so it can never run against a real database. The test profile adds this
-- directory as a second Flyway location (see application-test.yml).
--
-- Every identifier here is unquoted, which makes them all case-insensitive on H2 - that is why the
-- camelCase column names resolve against the entity's unquoted references. USER being a reserved
-- word is handled by NON_KEYWORDS on the H2 URL instead of by quoting (see application-test.yml);
-- quoting would make the name case-sensitive and stop it matching the entity, which has no
-- explicit @Table beyond "User" and so refers to the table unquoted.
--
-- Confirmed via SHOW COLUMNS against superapp_db: User itself only carries five columns
-- (user_id, createdDateTime, enabled, deleted, createdByAdminId) - everything else (name/email/
-- phone/gender/dateOfBirth/relationship/age/ageGroup on user_profile; role on user_access;
-- avatar_id/pet_id/family_id on user_module_links; isLoggedIn/emailVerified/lastLoginDate/
-- usernameChanged/oauth2_* on user_auth; coins/lifetimeCoinsEarned/lastDailyBonusDate on
-- user_wallet; currentStreak/highestStreak/freeStreakRestoresUsed/lastMissedStreak* on
-- user_streak; onboardingStep/as_child/moodInitialized on user_onboarding;
-- dailyActivityStreak/learningActivityStreak/totalActiveDays/lastStreakDate/learningStreak/
-- lastLearningDate/activityStreak/lastActivityDate/last_active_time on user_activity;
-- referralCode/usedReferralCode/referralCount/joinedWithReferral on user_referrals) lives on a
-- secondary table, exactly matching com.superme.model.User's own @SecondaryTables layout.
-- Avatar/Pet/Family/FamilyMember/CoinTransaction are unaffected by that split.

CREATE TABLE Family (
    family_id   INT          NOT NULL AUTO_INCREMENT,
    familyCode  VARCHAR(255) NOT NULL,
    familyName  VARCHAR(255) NOT NULL,
    createdBy   INT          DEFAULT NULL,
    createdAt   DATE         NOT NULL,
    PRIMARY KEY (family_id),
    UNIQUE (familyCode)
);

CREATE TABLE Avatar (
    avatar_id       INT          NOT NULL AUTO_INCREMENT,
    avatarName      VARCHAR(100) NOT NULL,
    gender          VARCHAR(255) DEFAULT NULL,
    url             VARCHAR(255) DEFAULT NULL,
    avatarImageName VARCHAR(255) DEFAULT NULL,
    renamedByUser   BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (avatar_id),
    UNIQUE (avatarName)
);

CREATE TABLE Pet (
    pet_id  INT          NOT NULL AUTO_INCREMENT,
    petName VARCHAR(255) NOT NULL,
    gender  VARCHAR(255) DEFAULT NULL,
    url     VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (pet_id)
);

CREATE TABLE User (
    user_id                INT          NOT NULL AUTO_INCREMENT,
    createdDateTime        TIMESTAMP    DEFAULT NULL,
    enabled                BOOLEAN      NOT NULL DEFAULT TRUE,
    deleted                BOOLEAN      DEFAULT NULL,
    createdByAdminId       TINYINT      DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE UserPassword (
    user_password_id INT          NOT NULL AUTO_INCREMENT,
    user_id           INT          DEFAULT NULL,
    password          VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_password_id),
    UNIQUE (user_id)
);

CREATE TABLE FamilyMember (
    family_member_id INT    NOT NULL AUTO_INCREMENT,
    family_id         INT    NOT NULL,
    user_id           INT    NOT NULL,
    dateOfBirth       DATE   NOT NULL,
    PRIMARY KEY (family_member_id)
);

-- Only the columns this server's registration flow fills; the real table also carries habit/task/
-- article/lesson/course/challenge/admin-action columns, all nullable and all belonging to features
-- this server has nothing to do with.
CREATE TABLE CoinTransaction (
    coin_transaction_id      INT       NOT NULL AUTO_INCREMENT,
    user_id                  INT       NOT NULL,
    amount                   INT       NOT NULL,
    coin_transaction_reason_id SMALLINT DEFAULT NULL,
    timestamp                TIMESTAMP NOT NULL,
    PRIMARY KEY (coin_transaction_id)
);

-- Lookup tables CoinTransaction's reason resolves through (see CoinTransactionWriter) - both
-- master_coin_transaction_types and coin_transaction_reason exist live on both superme_db and
-- superapp_db.
CREATE TABLE master_coin_transaction_types (
    type_id TINYINT      NOT NULL AUTO_INCREMENT,
    value   VARCHAR(64)  NOT NULL,
    PRIMARY KEY (type_id)
);

CREATE TABLE coin_transaction_reason (
    coin_transaction_reason_id SMALLINT     NOT NULL AUTO_INCREMENT,
    type_id                    TINYINT      DEFAULT NULL,
    description                VARCHAR(255) NOT NULL,
    PRIMARY KEY (coin_transaction_reason_id)
);

-- role_id lives here, not on User itself (same split as relationship_id/age_group_id on
-- user_profile below). TINYINT, matching superapp_db's role_id.
CREATE TABLE user_access (
    user_id INT     NOT NULL,
    role_id TINYINT DEFAULT NULL,
    PRIMARY KEY (user_id)
);

-- avatar_id/pet_id/family_id live here, not on User itself.
CREATE TABLE user_module_links (
    user_id    INT NOT NULL,
    avatar_id  INT DEFAULT NULL,
    pet_id     INT DEFAULT NULL,
    family_id  INT DEFAULT NULL,
    PRIMARY KEY (user_id)
);

-- New-schema secondary table that mirrors gender/relationship/age-group/name/username/email/
-- phone/dateOfBirth off master_* lookup tables. SuperMeBE's User entity reads these fields through
-- this table (not the flat User columns above), so UserRegistrationService.syncUserProfile writes
-- it directly on every signup. Only the columns that write touches. TINYINT for
-- age/gender_id/relationship_id/age_group_id, matching superapp_db.
CREATE TABLE user_profile (
    user_id         INT          NOT NULL,
    age             TINYINT      DEFAULT NULL,
    age_group_id    TINYINT      DEFAULT NULL,
    dateOfBirth     DATE         NOT NULL,
    email           VARCHAR(255) DEFAULT NULL,
    gender_id       TINYINT      DEFAULT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(255) DEFAULT NULL,
    relationship_id TINYINT      DEFAULT NULL,
    username        VARCHAR(255) DEFAULT NULL,
    dobChanged      BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

-- referralCode/usedReferralCode moved here off the flat User columns the same way as user_profile.
CREATE TABLE user_referrals (
    user_id           INT         NOT NULL,
    referralCode      VARCHAR(8)  DEFAULT NULL,
    joinedWithReferral BOOLEAN    NOT NULL DEFAULT FALSE,
    referralCount     INT         NOT NULL DEFAULT 0,
    usedReferralCode  VARCHAR(8)  DEFAULT NULL,
    PRIMARY KEY (user_id)
);

-- usernameChanged/isLoggedIn/emailVerified/lastLoginDate/oauth2_* moved here off the flat User
-- columns, matching superapp_db's user_auth.
CREATE TABLE user_auth (
    user_id                INT          NOT NULL,
    usernameChanged        BOOLEAN      NOT NULL DEFAULT FALSE,
    isLoggedIn             BOOLEAN      NOT NULL DEFAULT FALSE,
    emailVerified          BOOLEAN      NOT NULL DEFAULT FALSE,
    emailVerificationToken VARCHAR(255) DEFAULT NULL,
    lastLoginDate          TIMESTAMP    DEFAULT NULL,
    oauth2_provider_id     VARCHAR(255) DEFAULT NULL,
    oauth2_provider_type   VARCHAR(32)  DEFAULT NULL,
    oauth2_avatar_url      VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (user_id),
    UNIQUE (emailVerificationToken)
);

-- coins/lifetimeCoinsEarned/lastDailyBonusDate moved here off the flat User columns, matching
-- superapp_db's user_wallet.
CREATE TABLE user_wallet (
    user_id             INT  NOT NULL,
    coins               INT  NOT NULL DEFAULT 0,
    lifetimeCoinsEarned INT  NOT NULL DEFAULT 0,
    lastDailyBonusDate  DATE DEFAULT NULL,
    PRIMARY KEY (user_id)
);

-- currentStreak/highestStreak/freeStreakRestoresUsed/lastMissedStreak* moved here off the flat
-- User columns, matching superapp_db's user_streak.
CREATE TABLE user_streak (
    user_id                INT       NOT NULL,
    currentStreak          INT       NOT NULL DEFAULT 0,
    highestStreak          INT       NOT NULL DEFAULT 0,
    lastMissedStreakDate   DATE      DEFAULT NULL,
    lastMissedStreakAt     TIMESTAMP DEFAULT NULL,
    lastStreakCount        INT       DEFAULT NULL,
    freeStreakRestoresUsed INT       NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

-- onboardingStep/as_child/moodInitialized moved here off the flat User columns, matching
-- superapp_db's user_onboarding.
CREATE TABLE user_onboarding (
    user_id         INT     NOT NULL,
    onboardingStep  INT     NOT NULL DEFAULT 1,
    as_child        BOOLEAN DEFAULT NULL,
    moodInitialized BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

-- dailyActivityStreak/learningActivityStreak/totalActiveDays/lastStreakDate/learningStreak/
-- lastLearningDate/activityStreak/lastActivityDate/last_active_time moved here off the flat
-- User columns, matching superapp_db's user_activity.
CREATE TABLE user_activity (
    user_id                INT       NOT NULL,
    dailyActivityStreak    INT       NOT NULL DEFAULT 0,
    learningActivityStreak INT       NOT NULL DEFAULT 0,
    lastStreakDate         DATE      DEFAULT NULL,
    totalActiveDays        INT       NOT NULL DEFAULT 0,
    learningStreak         INT       NOT NULL DEFAULT 0,
    lastLearningDate       DATE      DEFAULT NULL,
    activityStreak         INT       NOT NULL DEFAULT 0,
    lastActivityDate       DATE      DEFAULT NULL,
    last_active_time       TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (user_id)
);
