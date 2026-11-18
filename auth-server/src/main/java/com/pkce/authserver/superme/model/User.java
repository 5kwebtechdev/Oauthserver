package com.pkce.authserver.superme.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import com.pkce.authserver.superme.converter.NullSafeConverters;
import com.pkce.authserver.superme.converter.UserAgeGroupIdConverter;
import com.pkce.authserver.superme.converter.UserGenderIdConverter;
import com.pkce.authserver.superme.converter.UserRelationshipIdConverter;
import com.pkce.authserver.superme.converter.UserRoleIdConverter;
import com.pkce.authserver.superme.enums.AgeGroup;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.SecondaryTable;
import jakarta.persistence.SecondaryTables;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;

/**
 * SuperMeBE's User (com.superme.model.User), ported to the new normalized schema: User now only
 * carries its PK plus a handful of columns, the rest live across the secondary tables declared
 * below, and gender/relationship/role/ageGroup resolve through small hardcoded-switch converters
 * against master-reference tables instead of being plain enum/string columns.
 *
 * Omitted from the copy, same as before the migration: User's five pure mappedBy collections -
 * calendarEvents, coinHistory, rewards, badges and notes. They own no column on this table, none
 * is read by the login response, and mapping them would pull CalendarEvent and its transitive
 * entity graph into an authorization server that has no use for any of it.
 *
 * There is deliberately an explicit @Table(name="User") now (there wasn't one before the
 * migration) because secondary tables must be attached to a named primary table. The H2
 * reserved-word handling in application-test.yml (NON_KEYWORDS) still applies to this name.
 */
@Entity
@Table(name = "User")
@SecondaryTables({
        @SecondaryTable(name = "user_access", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_activity", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_auth", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_streak", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_onboarding", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_pet_progress", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_profile", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_referrals", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_ui_state", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_wallet", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
        @SecondaryTable(name = "user_module_links", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id"))
})
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
    @Column(name = "user_id")
    private Integer id;

    @Column(name = "name", nullable = false, length = 150, table = "user_profile")
    private String name;

    @Column(name = "username", unique = true, length = 150, table = "user_profile")
    private String username; // Nullable: distinct from `name`, set at registration

    @Column(name = "email", unique = true, length = 150, table = "user_profile")
    private String email; // Nullable: Can register with phone only

    @Column(name = "phone", unique = true, length = 15, table = "user_profile")
    private String phone; // Nullable: Optional but must be unique

    @Convert(converter = UserGenderIdConverter.class)
    @Column(name = "gender_id", table = "user_profile", nullable = false)
    private String gender;

    @Column(name = "dateOfBirth", nullable = false, table = "user_profile")
    private LocalDate dateOfBirth; // Required

    // A non-admin user may change their own dateOfBirth only once after account creation.
    @Column(name = "dobChanged", nullable = false, table = "user_profile")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean dobChanged = false;

    // A non-admin user may change an existing username only once (choosing one for the first time is free).
    @Column(name = "usernameChanged", nullable = false, table = "user_auth")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean usernameChanged = false;

    @Convert(converter = UserRelationshipIdConverter.class)
    @Column(name = "relationship_id", table = "user_profile", nullable = false)
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
    @Column(name = "as_child", table = "user_onboarding")
    private Boolean asChild;

    // ─────────────────────────────
    // Authentication & Account Status
    // ─────────────────────────────
    @Convert(converter = UserRoleIdConverter.class)
    @Column(name = "role_id", table = "user_access", nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    @Column(name = "enabled", nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "isLoggedIn", nullable = false, table = "user_auth")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean isLoggedIn = false;

    @Column(name = "emailVerified", nullable = false, table = "user_auth")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean emailVerified = false;

    // Stores the last completed onboarding screen for resumable registration.
    @Column(name = "onboardingStep", nullable = false, table = "user_onboarding")
    @Builder.Default
    private Integer onboardingStep = 1;

    @Column(name = "emailVerificationToken", unique = true, table = "user_auth")
    private String emailVerificationToken;

    @Column(name = "lastLoginDate", table = "user_auth")
    private LocalDateTime lastLoginDate;

    @Column(name = "last_active_time", table = "user_activity")
    private LocalDateTime lastActiveTime;

    @Column(name = "createdDateTime")
    private LocalDateTime createdDateTime;

    // Id of the admin who created this user (null for self-registered users)
    @Column(name = "createdByAdminId")
    private Integer createdByAdminId;

    @Column(name = "referralCode", length = 8, table = "user_referrals")
    private String referralCode; // This user's own referral code (shared with others)

    @Column(name = "usedReferralCode", length = 8, table = "user_referrals")
    private String usedReferralCode; // The referral code this user joined with (null if none)

    @Column(name = "referralCount", nullable = false, table = "user_referrals")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int referralCount = 0; // How many users joined using this user's referral code

    @Column(name = "joinedWithReferral", nullable = false, table = "user_referrals")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean joinedWithReferral = false; // Whether this user registered using someone else's referral code

    // ─────────────────────────────
    // Gamification Fields
    // ─────────────────────────────
    @Column(name = "coins", nullable = false, table = "user_wallet")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int coins = 0;

    // Total coins ever earned — never decremented by spending. Used for Coin Collector badge progress.
    @Column(name = "lifetimeCoinsEarned", nullable = false, table = "user_wallet")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int lifetimeCoinsEarned = 0;

    @Column(name = "currentStreak", nullable = false, table = "user_streak")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int currentStreak = 0;

    @Column(name = "highestStreak", nullable = false, table = "user_streak")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int highestStreak = 0;

    // ─────────────────────────────
    // Derived Attributes
    // ─────────────────────────────
    @Column(name = "age", nullable = false, table = "user_profile")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int age = 0;

    @Convert(converter = UserAgeGroupIdConverter.class)
    @Column(name = "age_group_id", table = "user_profile", nullable = false)
    @Builder.Default
    private AgeGroup ageGroup = AgeGroup.BELOW_11;

    // ─────────────────────────────
    // Relationships
    // ─────────────────────────────
    @ManyToOne
    @JsonBackReference
    @JoinColumn(name = "family_id", table = "user_module_links")
    private Family family;

    @OneToOne
    @JoinColumn(name = "avatar_id", table = "user_module_links")
    private Avatar avatar;

    @ManyToOne
    @JoinColumn(name = "pet_id", table = "user_module_links")
    private Pet pet;

    @Column(name = "dailyActivityStreak", nullable = false, table = "user_activity")
    @Builder.Default
    private Integer dailyActivityStreak = 0;

    @Column(name = "learningActivityStreak", nullable = false, table = "user_activity")
    @Builder.Default
    private Integer learningActivityStreak = 0;

    @Column(name = "lastDailyBonusDate", table = "user_wallet")
    private LocalDate lastDailyBonusDate;

    // Used ONLY for streak calculation
    @Column(name = "lastStreakDate", table = "user_activity")
    private LocalDate lastStreakDate;

    @Column(name = "totalActiveDays", nullable = false, table = "user_activity")
    @Builder.Default
    private Integer totalActiveDays = 0;

    @Column(name = "lastMissedStreakDate", table = "user_streak")
    private LocalDate lastMissedStreakDate;
    @Column(name = "lastMissedStreakAt", table = "user_streak")
    private LocalDateTime lastMissedStreakAt;
    @Column(name = "lastStreakCount", table = "user_streak")
    private Integer lastStreakCount;

    // Number of free app-open-streak restores used (first 3 are free, then coins are required)
    @Column(name = "freeStreakRestoresUsed", nullable = false, table = "user_streak")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int freeStreakRestoresUsed = 0;

    @Column(name = "petAgeStage", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petAgeStage = 1;

    @Column(name = "petActivityCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.DoubleConverter.class)
    private double petActivityCount = 0.0;

    @Column(name = "petTaskCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petTaskCompletionCount = 0;

    @Column(name = "petHabitCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petHabitCompletionCount = 0;

    @Column(name = "petQuizCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petQuizCompletionCount = 0;

    @Column(name = "petPuzzleCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petPuzzleCompletionCount = 0;

    @Column(name = "petArticleCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petArticleCompletionCount = 0;

    @Column(name = "petLessonCompletionCount", nullable = false, table = "user_pet_progress")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int petLessonCompletionCount = 0;

    // ─────────────────────────────
    // Pet Overlay Tracking
    // ─────────────────────────────

    /** Has the first-signup bonus-coin overlay been dismissed by the user? */
    @Column(name = "bonusCoinOverlayDismissed", nullable = false, table = "user_ui_state")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean bonusCoinOverlayDismissed = false;

    /** The date the daily-login overlay was last dismissed (prevents re-showing same day). */
    @Column(name = "lastDailyLoginOverlayDate", table = "user_ui_state")
    private LocalDate lastDailyLoginOverlayDate;

    /**
     * Last streak-milestone (multiple of 7) whose overlay the user has dismissed.
     * 0 means no milestone overlay has been shown yet.
     */
    @Column(name = "lastStreakMilestoneCelebrated", nullable = false, table = "user_ui_state")
    @Builder.Default
    @Convert(converter = NullSafeConverters.IntConverter.class)
    private int lastStreakMilestoneCelebrated = 0;

    /** Has the user ever set a mood? Once true, MOOD_PROMPT overlay is never shown again. */
    @Column(name = "moodInitialized", nullable = false, table = "user_onboarding")
    @Builder.Default
    @Convert(converter = NullSafeConverters.BooleanConverter.class)
    private boolean moodInitialized = false;

    // Learning Enthusiast
    @Column(name = "learningStreak", nullable = false, table = "user_activity")
    @Builder.Default
    private Integer learningStreak = 0;

    @Column(name = "lastLearningDate", table = "user_activity")
    private LocalDate lastLearningDate;

    // Daily Champion
    @Column(name = "activityStreak", nullable = false, table = "user_activity")
    @Builder.Default
    private Integer activityStreak = 0;
    @Column(name = "lastActivityDate", table = "user_activity")
    private LocalDate lastActivityDate;

    // OAuth2 fields (for social login)
    @Column(name = "oauth2_provider_id", nullable = true, table = "user_auth")
    private String oauth2ProviderId;

    @Column(name = "oauth2_provider_type", nullable = true, length = 32, table = "user_auth")
    private String oauth2ProviderType;  // GOOGLE, GITHUB

    @Column(name = "oauth2_avatar_url", nullable = true, table = "user_auth")
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
    public User(Integer id, String name) {
        this.id = id;
        this.name = name;
    }
}
