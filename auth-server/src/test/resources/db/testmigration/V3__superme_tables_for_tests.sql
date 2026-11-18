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
-- Reflects SuperMeBE's post-migration normalized schema: User itself only carries user_id, and the
-- rest of its scalar columns live across the user_* secondary tables below, matching the
-- @SecondaryTables declared on com.pkce.authserver.superme.model.User. gender/relationship/role/
-- ageGroup are tiny Byte ids resolved through hardcoded-switch converters (no real master-table FK
-- enforced here - the converters are the only thing that needs the id to mean what it says).
--
-- Only the columns the ported entities actually map are present. The real User table has many more
-- secondary-table columns across all its features; the entities map all of its scalar columns the
-- login/registration path needs, so the difference is just the five mappedBy collections
-- (calendarEvents, coinHistory, rewards, badges, notes) that own no column on User at all.

CREATE TABLE Family (
    family_id   INT       NOT NULL AUTO_INCREMENT,
    familyCode  VARCHAR(255) NOT NULL,
    familyName  VARCHAR(255) NOT NULL,
    createdBy   INT       DEFAULT NULL,
    createdAt   DATE         NOT NULL,
    PRIMARY KEY (family_id),
    UNIQUE (familyCode)
);

CREATE TABLE Avatar (
    avatar_id       INT       NOT NULL AUTO_INCREMENT,
    avatarName      VARCHAR(100) NOT NULL,
    gender_id       TINYINT      DEFAULT NULL,
    url             VARCHAR(255) DEFAULT NULL,
    avatarImageName VARCHAR(255) DEFAULT NULL,
    renamedByUser   BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (avatar_id),
    UNIQUE (avatarName)
);

CREATE TABLE Pet (
    pet_id    INT       NOT NULL AUTO_INCREMENT,
    petName   VARCHAR(255) NOT NULL,
    gender_id TINYINT      DEFAULT NULL,
    url       VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (pet_id)
);

CREATE TABLE User (
    user_id    INT NOT NULL AUTO_INCREMENT,
    enabled    BOOLEAN NOT NULL DEFAULT TRUE,
    createdDateTime  TIMESTAMP DEFAULT NULL,
    createdByAdminId INT DEFAULT NULL,
    deleted    BOOLEAN DEFAULT NULL,
    family_id  INT DEFAULT NULL,
    avatar_id  INT DEFAULT NULL,
    pet_id     INT DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_profile (
    user_id         INT       NOT NULL,
    name            VARCHAR(150) NOT NULL,
    username        VARCHAR(150) DEFAULT NULL,
    email           VARCHAR(150) DEFAULT NULL,
    phone           VARCHAR(15)  DEFAULT NULL,
    gender_id       TINYINT      NOT NULL,
    dateOfBirth     DATE         NOT NULL,
    dobChanged      BOOLEAN      NOT NULL DEFAULT FALSE,
    relationship_id TINYINT      NOT NULL,
    age             INT          NOT NULL DEFAULT 0,
    age_group_id    TINYINT      NOT NULL,
    PRIMARY KEY (user_id),
    UNIQUE (username),
    UNIQUE (email),
    UNIQUE (phone)
);

CREATE TABLE user_auth (
    user_id                INT       NOT NULL,
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

CREATE TABLE user_access (
    user_id INT  NOT NULL,
    role_id TINYINT NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_onboarding (
    user_id        INT  NOT NULL,
    onboardingStep INT     NOT NULL DEFAULT 1,
    as_child       BOOLEAN DEFAULT NULL,
    moodInitialized BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_referrals (
    user_id            INT      NOT NULL,
    referralCode       VARCHAR(8)  DEFAULT NULL,
    usedReferralCode   VARCHAR(8)  DEFAULT NULL,
    referralCount      INT         NOT NULL DEFAULT 0,
    joinedWithReferral BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_wallet (
    user_id             INT NOT NULL,
    coins               INT    NOT NULL DEFAULT 0,
    lifetimeCoinsEarned INT    NOT NULL DEFAULT 0,
    lastDailyBonusDate  DATE   DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_streak (
    user_id                INT NOT NULL,
    currentStreak          INT    NOT NULL DEFAULT 0,
    highestStreak          INT    NOT NULL DEFAULT 0,
    lastMissedStreakDate   DATE   DEFAULT NULL,
    lastMissedStreakAt     TIMESTAMP DEFAULT NULL,
    lastStreakCount        INT    DEFAULT NULL,
    freeStreakRestoresUsed INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_activity (
    user_id                 INT    NOT NULL,
    last_active_time        TIMESTAMP DEFAULT NULL,
    dailyActivityStreak     INT       NOT NULL DEFAULT 0,
    learningActivityStreak  INT       NOT NULL DEFAULT 0,
    lastStreakDate          DATE      DEFAULT NULL,
    totalActiveDays         INT       NOT NULL DEFAULT 0,
    learningStreak          INT       NOT NULL DEFAULT 0,
    lastLearningDate        DATE      DEFAULT NULL,
    activityStreak          INT       NOT NULL DEFAULT 0,
    lastActivityDate        DATE      DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_pet_progress (
    user_id                   INT NOT NULL,
    petAgeStage               INT    NOT NULL DEFAULT 1,
    petActivityCount          DOUBLE NOT NULL DEFAULT 0,
    petTaskCompletionCount    INT    NOT NULL DEFAULT 0,
    petHabitCompletionCount   INT    NOT NULL DEFAULT 0,
    petQuizCompletionCount    INT    NOT NULL DEFAULT 0,
    petPuzzleCompletionCount  INT    NOT NULL DEFAULT 0,
    petArticleCompletionCount INT    NOT NULL DEFAULT 0,
    petLessonCompletionCount  INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_ui_state (
    user_id                       INT  NOT NULL,
    bonusCoinOverlayDismissed     BOOLEAN NOT NULL DEFAULT FALSE,
    lastDailyLoginOverlayDate     DATE    DEFAULT NULL,
    lastBirthdayPopupShownYear    INT     DEFAULT NULL,
    lastStreakMilestoneCelebrated INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_module_links (
    user_id   INT NOT NULL,
    family_id INT DEFAULT NULL,
    avatar_id INT DEFAULT NULL,
    pet_id    INT DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE UserPassword (
    user_password_id INT       NOT NULL AUTO_INCREMENT,
    user_id          INT       DEFAULT NULL,
    password         VARCHAR(255) NOT NULL,
    PRIMARY KEY (user_password_id),
    UNIQUE (user_id)
);

CREATE TABLE FamilyMember (
    family_member_id INT NOT NULL AUTO_INCREMENT,
    family_id         INT NOT NULL,
    user_id           INT NOT NULL,
    dateOfBirth       DATE   NOT NULL,
    PRIMARY KEY (family_member_id)
);

CREATE TABLE master_coin_transaction_types (
    type_id INT      NOT NULL AUTO_INCREMENT,
    value   VARCHAR(64) NOT NULL,
    PRIMARY KEY (type_id)
);

CREATE TABLE coin_transaction_reason (
    coin_transaction_reason_id INT       NOT NULL AUTO_INCREMENT,
    type_id                    INT       DEFAULT NULL,
    description                VARCHAR(255) NOT NULL,
    PRIMARY KEY (coin_transaction_reason_id)
);

-- Only the columns this server's registration flow fills; the real table also carries habit/task/
-- article/lesson/course/challenge/admin-action columns, all nullable and all belonging to features
-- this server has nothing to do with.
CREATE TABLE CoinTransaction (
    coin_transaction_id       INT    NOT NULL AUTO_INCREMENT,
    user_id                   INT    NOT NULL,
    amount                    INT       NOT NULL,
    coin_transaction_reason_id INT   NOT NULL,
    timestamp                 TIMESTAMP NOT NULL,
    PRIMARY KEY (coin_transaction_id)
);
