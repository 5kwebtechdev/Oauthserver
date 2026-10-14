package com.pkce.authserver.superme.util;

import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.model.Family;
import com.pkce.authserver.superme.model.User;

import java.util.List;

/**
 * Copied verbatim from SuperMeBE (com.superme.util.FamilyMembers).
 *
 * A soft-deleted account keeps its family link (its row is retained for history), so anything that lists,
 * counts or notifies "the family" must skip deleted accounts.
 */
public final class FamilyMembers {

    private FamilyMembers() {
    }

    public static boolean isActive(User user) {
        return user != null && !Boolean.TRUE.equals(user.getDeleted());
    }

    /**
     * A co-parent is a PARENT who did not create the family. Their relationship stays PARENT; this only tells the
     * creator apart. A family with no recorded creator has no way to tell, so nobody is flagged.
     */
    public static boolean isCoParent(Family family, User user) {
        return family != null && user != null && family.getCreatedBy() != null
                && user.getRelationship() == Relationship.PARENT
                && !family.getCreatedBy().equals(user.getId());
    }

    /** Users linked to the family who have not been deleted (empty when the family or its member list is missing). */
    public static List<User> active(Family family) {
        if (family == null || family.getMembers() == null) return List.of();
        return family.getMembers().stream().filter(FamilyMembers::isActive).toList();
    }
}
