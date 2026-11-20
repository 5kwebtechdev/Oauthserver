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
-- Confirmed via SHOW COLUMNS/information_schema against the live dev DB: User, UserPassword,
-- Avatar, Pet, Family, FamilyMember, and CoinTransaction are all still their original flat shape -
-- gender/relationship/role/ageGroup are still plain columns directly on User (not resolved
-- through any master-reference table), avatar_id/family_id/pet_id/createdByAdminId are still
-- plain columns on User itself, and CoinTransaction's type/description are still real, required
-- columns. The only schema change from the original mapping is every table's own PK: BIGINT ->
-- INT UNSIGNED for User, unchanged (still BIGINT) for the others. The new user_*/user_module_links
-- tables exist live but nothing in this server's Java maps to them, so they are not recreated here.
--
-- Only the columns the ported entities actually map are present. The real User table has many more
-- columns across all its features; the entity maps all of its scalar columns the login/
-- registration path needs, so the difference is just the five mappedBy collections
-- (calendarEvents, coinHistory, rewards, badges, notes) that own no column on User at all.

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
    name                   VARCHAR(255) NOT NULL,
    username               VARCHAR(255) DEFAULT NULL,
    email                  VARCHAR(255) DEFAULT NULL,
    phone                  VARCHAR(255) DEFAULT NULL,
    gender                 VARCHAR(255) NOT NULL,
    dateOfBirth            DATE         NOT NULL,
    dobChanged             BOOLEAN      NOT NULL DEFAULT FALSE,
    usernameChanged        BOOLEAN      NOT NULL DEFAULT FALSE,
    deleted                BOOLEAN      DEFAULT NULL,
    as_child               BOOLEAN      DEFAULT NULL,
    enabled                BOOLEAN      NOT NULL DEFAULT TRUE,
    isLoggedIn             BOOLEAN      NOT NULL DEFAULT FALSE,
    emailVerified          BOOLEAN      NOT NULL DEFAULT FALSE,
    onboardingStep         INT          NOT NULL DEFAULT 1,
    emailVerificationToken VARCHAR(255) DEFAULT NULL,
    lastLoginDate          TIMESTAMP    DEFAULT NULL,
    last_active_time       TIMESTAMP    DEFAULT NULL,
    createdDateTime        TIMESTAMP    DEFAULT NULL,
    createdByAdminId       BIGINT       DEFAULT NULL,
    referralCode           VARCHAR(255) DEFAULT NULL,
    usedReferralCode       VARCHAR(255) DEFAULT NULL,
    referralCount          INT          NOT NULL DEFAULT 0,
    joinedWithReferral     BOOLEAN      NOT NULL DEFAULT FALSE,
    coins                  INT          NOT NULL DEFAULT 0,
    lifetimeCoinsEarned    INT          NOT NULL DEFAULT 0,
    currentStreak          INT          NOT NULL DEFAULT 0,
    highestStreak          INT          NOT NULL DEFAULT 0,
    age                    INT          NOT NULL DEFAULT 0,
    family_id              INT          DEFAULT NULL,
    dailyActivityStreak    INT          NOT NULL DEFAULT 0,
    learningActivityStreak INT          NOT NULL DEFAULT 0,
    lastDailyBonusDate     DATE         DEFAULT NULL,
    lastStreakDate         DATE         DEFAULT NULL,
    totalActiveDays        INT          NOT NULL DEFAULT 0,
    lastMissedStreakDate   DATE         DEFAULT NULL,
    lastMissedStreakAt     TIMESTAMP    DEFAULT NULL,
    lastStreakCount        INT          DEFAULT NULL,
    freeStreakRestoresUsed INT          NOT NULL DEFAULT 0,
    petAgeStage                  INT     NOT NULL DEFAULT 1,
    petActivityCount              DOUBLE  NOT NULL DEFAULT 0,
    petTaskCompletionCount        INT     NOT NULL DEFAULT 0,
    petHabitCompletionCount       INT     NOT NULL DEFAULT 0,
    petQuizCompletionCount        INT     NOT NULL DEFAULT 0,
    petPuzzleCompletionCount      INT     NOT NULL DEFAULT 0,
    petArticleCompletionCount     INT     NOT NULL DEFAULT 0,
    petLessonCompletionCount      INT     NOT NULL DEFAULT 0,
    bonusCoinOverlayDismissed     BOOLEAN NOT NULL DEFAULT FALSE,
    lastDailyLoginOverlayDate     DATE    DEFAULT NULL,
    lastStreakMilestoneCelebrated INT     NOT NULL DEFAULT 0,
    moodInitialized               BOOLEAN NOT NULL DEFAULT FALSE,
    learningStreak         INT          NOT NULL DEFAULT 0,
    lastLearningDate       DATE         DEFAULT NULL,
    activityStreak         INT          NOT NULL DEFAULT 0,
    lastActivityDate       DATE         DEFAULT NULL,
    oauth2_provider_id     VARCHAR(255) DEFAULT NULL,
    oauth2_provider_type   VARCHAR(255) DEFAULT NULL,
    oauth2_avatar_url      VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (user_id),
    UNIQUE (username),
    UNIQUE (email),
    UNIQUE (phone),
    UNIQUE (emailVerificationToken)
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
    coin_transaction_id INT          NOT NULL AUTO_INCREMENT,
    user_id              INT          NOT NULL,
    amount                INT          NOT NULL,
    type                  VARCHAR(255) NOT NULL,
    description           VARCHAR(255) NOT NULL,
    timestamp             TIMESTAMP    NOT NULL,
    PRIMARY KEY (coin_transaction_id)
);

-- role_id lives here, not on User itself (same split as relationship_id/age_group_id on
-- user_profile below).
CREATE TABLE user_access (
    user_id INT NOT NULL,
    role_id INT DEFAULT NULL,
    PRIMARY KEY (user_id)
);

-- avatar_id/pet_id live here, not on User itself.
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
-- it directly on every signup. Only the columns that write touches.
CREATE TABLE user_profile (
    user_id         INT          NOT NULL,
    age             INT          DEFAULT NULL,
    age_group_id    TINYINT      DEFAULT NULL,
    dateOfBirth     DATE         NOT NULL,
    email           VARCHAR(255) DEFAULT NULL,
    gender_id       INT          DEFAULT NULL,
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
