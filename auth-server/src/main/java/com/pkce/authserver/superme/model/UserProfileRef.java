package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * Read-only mapping of user_profile, used purely for User's @Transient+Ref fallback getters
 * below (the same pattern SuperMeBE's own entities use for location fields). Deliberately not a
 * @SecondaryTable on User: (1) Hibernate always inserts a secondary-table row when its owning
 * entity is persisted regardless of insertable=false on every mapped column, which would violate
 * user_profile's NOT NULL dateOfBirth on every plain userRepository.save(new User()) - confirmed
 * by this server's own tests; (2) SupermeUserRepository's native queries (findByEmail etc.) only
 * SELECT u.*, not user_profile's columns, so a same-result-set secondary-table mapping would
 * hydrate null anyway. A separate, lazily-fetched association sidesteps both problems: nothing
 * ever calls save() on this entity (UserRegistrationService.syncUserProfile's raw JDBC upsert is
 * the only writer), and accessing it triggers its own SELECT by user_id whenever something
 * actually needs these fields.
 */
@Entity
@Table(name = "user_profile")
@Getter
@NoArgsConstructor
public class UserProfileRef {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "name")
    private String name;

    @Column(name = "username")
    private String username;

    @Column(name = "email")
    private String email;

    @Column(name = "phone")
    private String phone;

    // TINYINT UNSIGNED on the live table, same family as relationship_id/age_group_id/role_id.
    @Column(name = "gender_id")
    private Byte genderId;

    @Column(name = "dateOfBirth")
    private LocalDate dateOfBirth;

    @Column(name = "dobChanged")
    private boolean dobChanged;

    @Column(name = "relationship_id")
    private Byte relationshipId;

    // TINYINT UNSIGNED on the live table (age never exceeds 127).
    @Column(name = "age")
    private Byte age;

    @Column(name = "age_group_id")
    private Byte ageGroupId;
}
