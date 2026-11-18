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
-- User's scalar columns now live across the user_* secondary tables below, confirmed via
-- information_schema against the live dev DB AND by joining User to each one and comparing
-- values across all 515 live rows (all identical - these tables are kept in sync, not stale).
-- Avatar/Pet/Family/FamilyMember/UserPassword/CoinTransaction are unchanged from before this
-- migration - still their original flat shape, plain BIGINT ids (except User's own PK: BIGINT ->
-- INT UNSIGNED). avatar_id/family_id/pet_id/createdByAdminId stay on the main User table - see
-- the comment on com.pkce.authserver.superme.model.User for why (type mismatch with
-- user_module_links, which is otherwise in sync too but unused here).
--
-- Only the columns the ported entities actually map are present. The real tables have more
-- columns across other features; the entity maps all of the scalar columns the login/
-- registration path needs, so the difference is just the five mappedBy collections (calendarEvents,
-- coinHistory, rewards, badges, notes) that own no column at all.

CREATE TABLE Family (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    familyCode  VARCHAR(255) NOT NULL,
    familyName  VARCHAR(255) NOT NULL,
    createdBy   BIGINT       DEFAULT NULL,
    createdAt   DATE         NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (familyCode)
);

CREATE TABLE Avatar (
    id              BIGINT       NOT NULL AUTO_INCREMENT,
    avatarName      VARCHAR(100) NOT NULL,
    gender          VARCHAR(255) DEFAULT NULL,
    url             VARCHAR(255) DEFAULT NULL,
    avatarImageName VARCHAR(255) DEFAULT NULL,
    renamedByUser   BOOLEAN      NOT NULL DEFAULT FALSE,
    PRIMARY KEY (id),
    UNIQUE (avatarName)
);

CREATE TABLE Pet (
    id      BIGINT       NOT NULL AUTO_INCREMENT,
    petName VARCHAR(255) NOT NULL,
    gender  VARCHAR(255) DEFAULT NULL,
    url     VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id)
);

-- Only id/enabled/deleted/createdDateTime/avatar_id/family_id/pet_id/createdByAdminId remain
-- directly on User itself; everything else moved to the user_* tables below.
CREATE TABLE User (
    id               INT       NOT NULL AUTO_INCREMENT,
    enabled          BOOLEAN   NOT NULL DEFAULT TRUE,
    deleted          BOOLEAN   DEFAULT NULL,
    createdDateTime  TIMESTAMP DEFAULT NULL,
    createdByAdminId BIGINT    DEFAULT NULL,
    family_id        BIGINT    DEFAULT NULL,
    avatar_id        BIGINT    DEFAULT NULL,
    pet_id           BIGINT    DEFAULT NULL,
    PRIMARY KEY (id)
);

CREATE TABLE user_profile (
    user_id         INT          NOT NULL,
    name            VARCHAR(150) NOT NULL,
    username        VARCHAR(150) DEFAULT NULL,
    email           VARCHAR(150) DEFAULT NULL,
    phone           VARCHAR(20)  DEFAULT NULL,
    gender_id       INT          NOT NULL,
    dateOfBirth     DATE         NOT NULL,
    dobChanged      BOOLEAN      NOT NULL DEFAULT FALSE,
    relationship_id INT          NOT NULL,
    age             TINYINT      NOT NULL DEFAULT 0,
    age_group_id    INT          NOT NULL,
    PRIMARY KEY (user_id),
    UNIQUE (username),
    UNIQUE (email),
    UNIQUE (phone)
);

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

CREATE TABLE user_access (
    user_id INT NOT NULL,
    role_id INT NOT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_onboarding (
    user_id         INT     NOT NULL,
    onboardingStep  INT     NOT NULL DEFAULT 1,
    as_child        BOOLEAN DEFAULT NULL,
    moodInitialized BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_referrals (
    user_id            INT        NOT NULL,
    referralCode       VARCHAR(8) DEFAULT NULL,
    usedReferralCode   VARCHAR(8) DEFAULT NULL,
    referralCount      INT        NOT NULL DEFAULT 0,
    joinedWithReferral BOOLEAN    NOT NULL DEFAULT FALSE,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_wallet (
    user_id             INT  NOT NULL,
    coins               INT  NOT NULL DEFAULT 0,
    lifetimeCoinsEarned INT  NOT NULL DEFAULT 0,
    lastDailyBonusDate  DATE DEFAULT NULL,
    PRIMARY KEY (user_id)
);

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

CREATE TABLE user_activity (
    user_id                INT       NOT NULL,
    activityStreak         INT       NOT NULL DEFAULT 0,
    dailyActivityStreak    INT       NOT NULL DEFAULT 0,
    lastActivityDate       DATE      DEFAULT NULL,
    lastLearningDate       DATE      DEFAULT NULL,
    lastStreakDate         DATE      DEFAULT NULL,
    learningActivityStreak INT       NOT NULL DEFAULT 0,
    learningStreak         INT       NOT NULL DEFAULT 0,
    totalActiveDays        INT       NOT NULL DEFAULT 0,
    last_active_time       TIMESTAMP DEFAULT NULL,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_pet_progress (
    user_id                   INT    NOT NULL,
    petActivityCount          DOUBLE NOT NULL DEFAULT 0,
    petAgeStage               INT    NOT NULL DEFAULT 1,
    petArticleCompletionCount INT    NOT NULL DEFAULT 0,
    petHabitCompletionCount   INT    NOT NULL DEFAULT 0,
    petLessonCompletionCount  INT    NOT NULL DEFAULT 0,
    petPuzzleCompletionCount  INT    NOT NULL DEFAULT 0,
    petQuizCompletionCount    INT    NOT NULL DEFAULT 0,
    petTaskCompletionCount    INT    NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

CREATE TABLE user_ui_state (
    user_id                       INT     NOT NULL,
    bonusCoinOverlayDismissed     BOOLEAN NOT NULL DEFAULT FALSE,
    lastDailyLoginOverlayDate     DATE    DEFAULT NULL,
    lastStreakMilestoneCelebrated INT     NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id)
);

CREATE TABLE UserPassword (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    user_id  INT          DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (user_id)
);

CREATE TABLE FamilyMember (
    id          BIGINT NOT NULL AUTO_INCREMENT,
    family_id   BIGINT NOT NULL,
    user_id     INT    NOT NULL,
    dateOfBirth DATE   NOT NULL,
    PRIMARY KEY (id)
);

-- Only the columns this server's registration flow fills; the real table also carries habit/task/
-- article/lesson/course/challenge/admin-action columns, all nullable and all belonging to features
-- this server has nothing to do with.
CREATE TABLE CoinTransaction (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     INT          NOT NULL,
    amount      INT          NOT NULL,
    type        VARCHAR(255) NOT NULL,
    description VARCHAR(255) NOT NULL,
    timestamp   TIMESTAMP    NOT NULL,
    PRIMARY KEY (id)
);
