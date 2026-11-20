package com.pkce.authserver.superme.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Read-only mapping of user_profile's relationship_id/age_group_id, used purely for
 * User.relationship/ageGroup's @PostLoad fallback (see the Transient+Ref pattern used throughout
 * SuperMeBE's own entities, e.g. Avatar/Pet/location fields). Deliberately not writable: User's
 * join to this entity is insertable=false/updatable=false, so Hibernate never tries to create or
 * update a user_profile row through it - user_profile has other NOT NULL columns (dateOfBirth,
 * name, age, dobChanged) that this entity doesn't map, and that only
 * UserRegistrationService.syncUserProfile's single upsert ever populates together.
 */
@Entity
@Table(name = "user_profile")
@Getter
@NoArgsConstructor
public class UserProfileRef {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    // TINYINT UNSIGNED on the live table, unlike role_id (confirmed INT) - same lookup-table-id
    // family but resized down separately.
    @Column(name = "relationship_id")
    private Byte relationshipId;

    @Column(name = "age_group_id")
    private Byte ageGroupId;
}
