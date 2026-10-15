package com.pkce.authserver.superme.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.pkce.authserver.superme.enums.AgeGroup;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

/**
 * SuperMeBE's User, copied field-for-field from com.superme.model.User so this authorization
 * server reads the one real user table (mindfullP1.User, 63 columns, ~458 live rows) instead of
 * inventing its own.
 *
 * Omitted from the copy are User's five pure mappedBy collections - calendarEvents, coinHistory,
 * rewards, badges and notes. They own no column on this table, none is read by the login response,
 * and mapping them would pull CalendarEvent (572 lines) and its transitive entity graph into an
 * authorization server that has no use for any of it.
 *
 * This class depends on the physical naming strategy preserving camelCase (see application.yml),
 * because the live columns are createdDateTime/dateOfBirth/etc. and NOT snake_case.
 *
 * There is deliberately no @Table, exactly as in their file: the entity name is the table name.
 * That leaves the identifier unquoted, which matters because USER is a reserved word in H2, where
 * the tests run - the test profile adds it to the H2 URL's NON_KEYWORDS list rather than quoting
 * the name here (see application-test.yml). Quoting it would have been the other option, but a
 * quoted name is case-sensitive on H2 and would then not match an unquoted reference anywhere
 * else, and hibernate.globally_quoted_identifiers would drag every other table and column in this
 * app into the same problem.
 *
 * INSERTing through this entity is not possible against the live schema: name, gender, dateOfBirth
 * and relationship are NOT NULL with no defaults and are only filled by SuperMeBE's multi-step
 * onboarding. This server authenticates accounts that already exist; it never creates them.
 */
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class User {

    // ─────────────────────────────
    // Basic Information
    // ─────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String username; // Nullable: distinct from `name`, set at registration

    @Column(unique = true)
    private String email; // Nullable: Can register with phone only

    @Column(unique = true)
    private String phone; // Nullable: Optional but must be unique

    @Column(nullable = false)
    private String gender;

    @Column(nullable = false)
    private LocalDate dateOfBirth; // Required

    // A non-admin user may change their own dateOfBirth only once after account creation.
    @Column(nullable = false)
    @Builder.Default
    private boolean dobChanged = false;

    // A non-admin user may change an existing username only once (choosing one for the first time is free).
    @Column(nullable = false)
    @Builder.Default
    private boolean usernameChanged = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Relationship relationship;

    @Column(name = "deleted", nullable = true)
    private Boolean deleted;

    /**
     * Frees the email/phone/OAuth identity a soft-deleted row is holding, so those values can be reused by a
     * brand-new account afterwards (registering again, including via Google/OAuth, otherwise finds this dead
     * row by email and either gets blocked by it or, worse, is silently signed into it).
     */
    public void clearIdentityForDeletion() {
        this.email = null;
        this.phone = null;
        this.emailVerificationToken = null;
        this.oauth2ProviderId = null;
    }

    // Marks a SELF user who registered intending to join a family as a CHILD later.
    @Column(name = "as_child")
    private Boolean asChild;

    // ─────────────────────────────
    // Authentication & Account Status
    // ─────────────────────────────
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(nullable = false)
    @Builder.Default
    private boolean isLoggedIn = false;

    @Column(nullable = false)
    @Builder.Default
    private boolean emailVerified = false;

    // Stores the last completed onboarding screen for resumable registration.
    @Column(nullable = false)
    @Builder.Default
    private Integer onboardingStep = 1;

    @Column(unique = true)
    private String emailVerificationToken;

    @Column
    private LocalDateTime lastLoginDate;

    @Column(name = "last_active_time")
    private LocalDateTime lastActiveTime;

    @Column
    private LocalDateTime createdDateTime;

    // Id of the admin who created this user (null for self-registered users)
    @Column
    private Long createdByAdminId;

    @Column
    private String referralCode; // This user's own referral code (shared with others)

    @Column
    private String usedReferralCode; // The referral code this user joined with (null if none)

    @Column(nullable = false)
    @Builder.Default
    private int referralCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean joinedWithReferral = false;

    // ─────────────────────────────
    // Gamification Fields
    // ─────────────────────────────
    @Column(nullable = false)
    @Builder.Default
    private int coins = 0;

    // Total coins ever earned — never decremented by spending. Used for Coin Collector badge progress.
    @Column(nullable = false)
    @Builder.Default
    private int lifetimeCoinsEarned = 0;

    @Column(nullable = false)
    @Builder.Default
    private int currentStreak = 0;

    @Column(nullable = false)
    @Builder.Default
    private int highestStreak = 0;

    // ─────────────────────────────
    // Derived Attributes
    // ─────────────────────────────
    @Column(nullable = false)
    @Builder.Default
    private int age = 0;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private AgeGroup ageGroup = AgeGroup.BELOW_11;

    // ─────────────────────────────
    // Relationships
    // ─────────────────────────────
    @ManyToOne
    @JsonBackReference
    private Family family;

    @OneToOne
    @JoinColumn(name = "avatar_id")
    private Avatar avatar;

    @ManyToOne
    @JoinColumn(name = "pet_id")
    private Pet pet;

    @Column(nullable = false)
    @Builder.Default
    private Integer dailyActivityStreak = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer learningActivityStreak = 0;

    private LocalDate lastDailyBonusDate;

    // Used ONLY for streak calculation
    private LocalDate lastStreakDate;

    @Column(nullable = false)
    @Builder.Default
    private Integer totalActiveDays = 0;

    private LocalDate lastMissedStreakDate;
    private LocalDateTime lastMissedStreakAt;
    private Integer lastStreakCount;

    // Number of free app-open-streak restores used (first 3 are free, then coins are required)
    @Column(nullable = false)
    @Builder.Default
    private int freeStreakRestoresUsed = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petAgeStage = 1;

    @Column(nullable = false)
    @Builder.Default
    private double petActivityCount = 0.0;

    @Column(nullable = false)
    @Builder.Default
    private int petTaskCompletionCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petHabitCompletionCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petQuizCompletionCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petPuzzleCompletionCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petArticleCompletionCount = 0;

    @Column(nullable = false)
    @Builder.Default
    private int petLessonCompletionCount = 0;

    // ─────────────────────────────
    // Pet Overlay Tracking
    // ─────────────────────────────

    /** Has the first-signup bonus-coin overlay been dismissed by the user? */
    @Column(nullable = false)
    @Builder.Default
    private boolean bonusCoinOverlayDismissed = false;

    /** The date the daily-login overlay was last dismissed (prevents re-showing same day). */
    @Column
    private LocalDate lastDailyLoginOverlayDate;

    /**
     * Last streak-milestone (multiple of 7) whose overlay the user has dismissed.
     * 0 means no milestone overlay has been shown yet.
     */
    @Column(nullable = false)
    @Builder.Default
    private int lastStreakMilestoneCelebrated = 0;

    /** Has the user ever set a mood? Once true, MOOD_PROMPT overlay is never shown again. */
    @Column(nullable = false)
    @Builder.Default
    private boolean moodInitialized = false;

    // Learning Enthusiast
    @Column(nullable = false)
    @Builder.Default
    private Integer learningStreak = 0;

    private LocalDate lastLearningDate;

    // Daily Champion
    @Column(nullable = false)
    @Builder.Default
    private Integer activityStreak = 0;
    private LocalDate lastActivityDate;

    // OAuth2 fields (for social login)
    @Column(name = "oauth2_provider_id", nullable = true)
    private String oauth2ProviderId;

    @Column(name = "oauth2_provider_type", nullable = true)
    private String oauth2ProviderType;  // GOOGLE, GITHUB

    @Column(name = "oauth2_avatar_url", nullable = true)
    private String oauth2AvatarUrl;

    // ─────────────────────────────
    // Lifecycle Methods
    // ─────────────────────────────
    @PrePersist
    @PreUpdate
    private void updateAgeAndAgeGroup() {
        if (this.dateOfBirth != null) {
            this.age = Period.between(this.dateOfBirth, LocalDate.now()).getYears();
            this.ageGroup = AgeGroup.fromAge(this.age);
        }
    }

    // ─────────────────────────────
    // Utility Methods
    // ─────────────────────────────
    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
        updateAgeAndAgeGroup();
    }

    public boolean isUsingEmail() {
        return email != null && !email.isBlank();
    }

    /** Returns the current age-band identifier for older values still stored in production. */
    public AgeGroup getAgeGroup() {
        return ageGroup == null ? null : ageGroup.canonical();
    }

    public boolean isUsingPhone() {
        return phone != null && !phone.isBlank();
    }

    public void setCreatedDateTimeOnRegister() {
        this.createdDateTime = LocalDateTime.now();
    }

    // Optional lightweight constructor
    public User(Long id, String name) {
        this.id = id;
        this.name = name;
    }
}
