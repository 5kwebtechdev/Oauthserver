package com.pkce.authserver.superme.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
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
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrimaryKeyJoinColumn;
import jakarta.persistence.SecondaryTable;
import jakarta.persistence.SecondaryTables;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * SuperMeBE's User, copied field-for-field from com.superme.model.User so this authorization
 * server reads the one real user table (superapp_db.User, confirmed via SHOW COLUMNS against the
 * live DB) instead of inventing its own.
 *
 * superapp_db's User table itself only carries five columns (user_id, createdDateTime, enabled,
 * deleted, createdByAdminId) - every other field lives on one of the secondary tables declared
 * below, confirmed one-for-one against com.superme.model.User's own @SecondaryTables/@Column
 * table= attributes and SHOW COLUMNS against each of those tables.
 *
 * This class depends on the physical naming strategy preserving camelCase (see application.yml),
 * because the live columns are createdDateTime/dateOfBirth/etc. and NOT snake_case.
 *
 * There is deliberately no @Table, exactly as in their file: the entity name is the table name.
 * That leaves the identifier unquoted, which matters because USER is a reserved word in H2, where
 * the tests run - the test profile adds it to the H2 URL's NON_KEYWORDS list rather than quoting
 * the name here (see application-test.yml).
 *
 * INSERTing through this entity is not possible against the live schema: name, gender,
 * dateOfBirth and relationship are NOT NULL with no defaults and are only filled by SuperMeBE's
 * multi-step onboarding. This server authenticates accounts that already exist; it never creates
 * them (except where UserRegistrationService explicitly upserts a specific secondary table).
 *
 * Omitted from the copy: User's five pure mappedBy collections (calendarEvents, coinHistory,
 * rewards, badges, notes - own no column, pull in entity graphs this server has no use for), and
 * every pet-progress (user_pet_progress)/UI-overlay-dismissal (user_ui_state)/
 * activity-streak (user_activity, besides last_active_time) field nothing in this codebase
 * reads or writes - confirmed by grep before leaving them out, same reasoning as the collections.
 */
@Entity
@Table(name = "User")
@SecondaryTables({
    @SecondaryTable(name = "user_access", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_activity", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_auth", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_streak", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_onboarding", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_referrals", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_wallet", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id")),
    @SecondaryTable(name = "user_module_links", pkJoinColumns = @PrimaryKeyJoinColumn(name = "user_id", referencedColumnName = "user_id"))
})
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Getter
@Setter
public class User {

    private static final UserRelationshipIdConverter RELATIONSHIP_ID_CONVERTER = new UserRelationshipIdConverter();
    private static final UserAgeGroupIdConverter AGE_GROUP_ID_CONVERTER = new UserAgeGroupIdConverter();

    // ─────────────────────────────
    // Basic Information
    // ─────────────────────────────
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id")
    private Integer id;

    // user_profile is NOT a @SecondaryTable here, deliberately: Hibernate always inserts a
    // secondary-table row when the owning entity is persisted regardless of insertable=false on
    // every mapped column (would violate user_profile's NOT NULL dateOfBirth on every plain
    // userRepository.save(new User())), and SupermeUserRepository's native queries only
    // SELECT u.* anyway, so a same-result-set mapping would hydrate null regardless. Instead,
    // these fields are @Transient with a lazy-loaded UserProfileRef fallback - the same pattern
    // this class already used for relationship/ageGroup before the rest of this split existed.
    // A freshly-built (unsaved, or not yet profile-synced) User's setter-assigned value always
    // wins; a reloaded one with no in-memory value falls back to the lazily-fetched profileRef.
    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private String name;

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private String username; // Nullable: distinct from `name`, set at registration

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private String email; // Nullable: Can register with phone only

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private String phone; // Nullable: Optional but must be unique

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private String gender;

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private LocalDate dateOfBirth; // Required

    // A non-admin user may change their own dateOfBirth only once after account creation.
    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private Boolean dobChanged;

    // A non-admin user may change an existing username only once (choosing one for the first time is free).
    @Column(name = "usernameChanged", nullable = false, table = "user_auth")
    private boolean usernameChanged;

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private Relationship relationship;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", referencedColumnName = "user_id", insertable = false, updatable = false)
    private UserProfileRef profileRef;

    public String getName() {
        return name != null ? name : profileRef == null ? null : profileRef.getName();
    }

    public String getUsername() {
        return username != null ? username : profileRef == null ? null : profileRef.getUsername();
    }

    public String getEmail() {
        return email != null ? email : profileRef == null ? null : profileRef.getEmail();
    }

    public String getPhone() {
        return phone != null ? phone : profileRef == null ? null : profileRef.getPhone();
    }

    public String getGender() {
        if (gender != null) return gender;
        Byte id = profileRef == null ? null : profileRef.getGenderId();
        return id == null ? null : new UserGenderIdConverter().convertToEntityAttribute(id);
    }

    public LocalDate getDateOfBirth() {
        return dateOfBirth != null ? dateOfBirth : profileRef == null ? null : profileRef.getDateOfBirth();
    }

    public boolean isDobChanged() {
        if (dobChanged != null) return dobChanged;
        return profileRef != null && profileRef.isDobChanged();
    }

    public Relationship getRelationship() {
        if (relationship != null) return relationship;
        Byte id = profileRef == null ? null : profileRef.getRelationshipId();
        return id == null ? null : RELATIONSHIP_ID_CONVERTER.convertToEntityAttribute(id);
    }

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

    @Column(nullable = false)
    @Builder.Default
    private boolean enabled = true;

    @Column(name = "isLoggedIn", nullable = false, table = "user_auth")
    private boolean isLoggedIn;

    @Column(name = "emailVerified", nullable = false, table = "user_auth")
    private boolean emailVerified;

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

    @Column
    private LocalDateTime createdDateTime;

    // Id of the admin who created this user (null for self-registered users). TINYINT UNSIGNED on
    // the live table (admin accounts are few), unlike every other *_id column here which is INT.
    @Column
    private Byte createdByAdminId;

    @Column(name = "referralCode", length = 8, table = "user_referrals")
    private String referralCode; // This user's own referral code (shared with others)

    @Column(name = "usedReferralCode", length = 8, table = "user_referrals")
    private String usedReferralCode; // The referral code this user joined with (null if none)

    @Column(name = "referralCount", nullable = false, table = "user_referrals")
    @Builder.Default
    private int referralCount = 0;

    @Column(name = "joinedWithReferral", nullable = false, table = "user_referrals")
    private boolean joinedWithReferral;

    // ─────────────────────────────
    // Gamification Fields
    // ─────────────────────────────
    @Column(name = "coins", nullable = false, table = "user_wallet")
    @Builder.Default
    private int coins = 0;

    // Total coins ever earned — never decremented by spending. Used for Coin Collector badge progress.
    @Column(name = "lifetimeCoinsEarned", nullable = false, table = "user_wallet")
    @Builder.Default
    private int lifetimeCoinsEarned = 0;

    @Column(name = "lastDailyBonusDate", table = "user_wallet")
    private LocalDate lastDailyBonusDate;

    @Column(name = "currentStreak", nullable = false, table = "user_streak")
    @Builder.Default
    private int currentStreak = 0;

    @Column(name = "highestStreak", nullable = false, table = "user_streak")
    @Builder.Default
    private int highestStreak = 0;

    // ─────────────────────────────
    // Derived Attributes
    // ─────────────────────────────
    // age/ageGroup are Transient + profileRef fallback too - see the comment above
    // name/email/etc. Recomputed from dateOfBirth on every save via updateAgeAndAgeGroup()
    // below, same as SuperMeBE's own entity, for syncUserProfile to read back afterward.
    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private Byte age;

    @Transient
    @Getter(lombok.AccessLevel.NONE)
    private AgeGroup ageGroup;

    public Byte getAge() {
        return age != null ? age : profileRef == null ? null : profileRef.getAge();
    }

    public AgeGroup getAgeGroup() {
        if (ageGroup != null) return ageGroup;
        Byte id = profileRef == null ? null : profileRef.getAgeGroupId();
        return id == null ? null : AGE_GROUP_ID_CONVERTER.convertToEntityAttribute(id);
    }

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
    // age/ageGroup are both insertable/updatable=false (see the field comments above), but
    // UserRegistrationService.syncUserProfile reads them back off this in-memory object right
    // after save() to build its own manual upsert into user_profile - so they still need to be
    // derived from dateOfBirth before that happens, exactly like SuperMeBE's own User entity.
    @jakarta.persistence.PrePersist
    @jakarta.persistence.PreUpdate
    private void updateAgeAndAgeGroup() {
        if (this.dateOfBirth != null) {
            int years = java.time.Period.between(this.dateOfBirth, LocalDate.now()).getYears();
            this.age = (byte) years;
            this.ageGroup = AgeGroup.fromAge(years);
        }
    }

    // ─────────────────────────────
    // Utility Methods
    // ─────────────────────────────
    public boolean isUsingEmail() {
        return email != null && !email.isBlank();
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
