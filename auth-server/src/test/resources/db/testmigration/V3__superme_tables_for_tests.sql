-- Stand-ins for the SuperMeBE tables this server reads but does not own.
--
-- In production these already exist in mindfullP1, created and maintained by SuperMeBE's own
-- Hibernate ddl-auto=update, and V2 deliberately does not create them - a migration of ours must
-- never define the shape of another application's tables. Tests still need somewhere for the
-- ported entities to read and write, so this file recreates them in H2, and it lives under
-- src/test/resources so it can never run against a real database. The test profile adds this
-- directory as a second Flyway location (see application-test.yml).
--
-- Every identifier here is unquoted, which makes them all case-insensitive on H2 - that is why the
-- camelCase column names resolve against the entity's unquoted references. USER being a reserved
-- word is handled by NON_KEYWORDS on the H2 URL instead of by quoting (see application-test.yml);
-- quoting would make the name case-sensitive and stop it matching the entity, which has no @Table
-- and so refers to the table unquoted.
--
-- Only the columns the ported entities actually map are present. The real table has 63; the
-- entities map all of its scalar columns, so the difference is just the five mappedBy collections
-- (calendarEvents, coinHistory, rewards, badges, notes) that own no column on User at all.

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

CREATE TABLE User (
    id                            BIGINT       NOT NULL AUTO_INCREMENT,
    name                          VARCHAR(255) NOT NULL,
    username                      VARCHAR(255) DEFAULT NULL,
    email                         VARCHAR(255) DEFAULT NULL,
    phone                         VARCHAR(255) DEFAULT NULL,
    gender                        VARCHAR(255) NOT NULL,
    dateOfBirth                   DATE         NOT NULL,
    dobChanged                    BOOLEAN      NOT NULL DEFAULT FALSE,
    usernameChanged               BOOLEAN      NOT NULL DEFAULT FALSE,
    relationship                  VARCHAR(255) NOT NULL,
    deleted                       BOOLEAN      DEFAULT NULL,
    as_child                      BOOLEAN      DEFAULT NULL,
    role                          VARCHAR(255) NOT NULL,
    enabled                       BOOLEAN      NOT NULL DEFAULT TRUE,
    isLoggedIn                    BOOLEAN      NOT NULL DEFAULT FALSE,
    emailVerified                 BOOLEAN      NOT NULL DEFAULT FALSE,
    onboardingStep                INT          NOT NULL DEFAULT 1,
    emailVerificationToken        VARCHAR(255) DEFAULT NULL,
    lastLoginDate                 TIMESTAMP    DEFAULT NULL,
    last_active_time              TIMESTAMP    DEFAULT NULL,
    createdDateTime               TIMESTAMP    DEFAULT NULL,
    createdByAdminId              BIGINT       DEFAULT NULL,
    referralCode                  VARCHAR(255) DEFAULT NULL,
    usedReferralCode              VARCHAR(255) DEFAULT NULL,
    referralCount                 INT          NOT NULL DEFAULT 0,
    joinedWithReferral            BOOLEAN      NOT NULL DEFAULT FALSE,
    coins                         INT          NOT NULL DEFAULT 0,
    lifetimeCoinsEarned           INT          NOT NULL DEFAULT 0,
    currentStreak                 INT          NOT NULL DEFAULT 0,
    highestStreak                 INT          NOT NULL DEFAULT 0,
    age                           INT          NOT NULL DEFAULT 0,
    ageGroup                      VARCHAR(255) NOT NULL,
    family_id                     BIGINT       DEFAULT NULL,
    avatar_id                     BIGINT       DEFAULT NULL,
    pet_id                        BIGINT       DEFAULT NULL,
    dailyActivityStreak           INT          NOT NULL DEFAULT 0,
    learningActivityStreak        INT          NOT NULL DEFAULT 0,
    lastDailyBonusDate            DATE         DEFAULT NULL,
    lastStreakDate                DATE         DEFAULT NULL,
    totalActiveDays               INT          NOT NULL DEFAULT 0,
    lastMissedStreakDate          DATE         DEFAULT NULL,
    lastMissedStreakAt            TIMESTAMP    DEFAULT NULL,
    lastStreakCount               INT          DEFAULT NULL,
    freeStreakRestoresUsed        INT          NOT NULL DEFAULT 0,
    petAgeStage                   INT          NOT NULL DEFAULT 1,
    petActivityCount              DOUBLE       NOT NULL DEFAULT 0,
    petTaskCompletionCount        INT          NOT NULL DEFAULT 0,
    petHabitCompletionCount       INT          NOT NULL DEFAULT 0,
    petQuizCompletionCount        INT          NOT NULL DEFAULT 0,
    petPuzzleCompletionCount      INT          NOT NULL DEFAULT 0,
    petArticleCompletionCount     INT          NOT NULL DEFAULT 0,
    petLessonCompletionCount      INT          NOT NULL DEFAULT 0,
    bonusCoinOverlayDismissed     BOOLEAN      NOT NULL DEFAULT FALSE,
    lastDailyLoginOverlayDate     DATE         DEFAULT NULL,
    lastStreakMilestoneCelebrated INT          NOT NULL DEFAULT 0,
    moodInitialized               BOOLEAN      NOT NULL DEFAULT FALSE,
    learningStreak                INT          NOT NULL DEFAULT 0,
    lastLearningDate              DATE         DEFAULT NULL,
    activityStreak                INT          NOT NULL DEFAULT 0,
    lastActivityDate              DATE         DEFAULT NULL,
    oauth2_provider_id            VARCHAR(255) DEFAULT NULL,
    oauth2_provider_type          VARCHAR(255) DEFAULT NULL,
    oauth2_avatar_url             VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE (username),
    UNIQUE (email),
    UNIQUE (phone),
    UNIQUE (emailVerificationToken)
);

CREATE TABLE UserPassword (
    id       BIGINT       NOT NULL AUTO_INCREMENT,
    user_id  BIGINT       DEFAULT NULL,
    password VARCHAR(255) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (user_id)
);

CREATE TABLE FamilyMember (
    id          BIGINT NOT NULL AUTO_INCREMENT,
    family_id   BIGINT NOT NULL,
    user_id     BIGINT NOT NULL,
    dateOfBirth DATE   NOT NULL,
    PRIMARY KEY (id)
);

-- Only the columns registration fills; the real table also carries habit/task/article/lesson/course
-- /challenge/admin-action columns, all nullable and all belonging to features this server has
-- nothing to do with.
CREATE TABLE CoinTransaction (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    user_id     BIGINT       NOT NULL,
    amount      INT          NOT NULL,
    type        VARCHAR(255) NOT NULL,
    timestamp   TIMESTAMP    NOT NULL,
    description VARCHAR(255) NOT NULL,
    PRIMARY KEY (id)
);
