package com.pkce.authserver.superme.enums;

/**
 * Copied verbatim from SuperMeBE (com.superme.enums.Role).
 *
 * The live mindfullP1 `User.role` column is an ENUM permitting only ADMIN, EXECUTIVE, MANAGER,
 * SUPER_ADMIN and USER - SELF, CHILD and PARENT exist in this Java enum but not in the column,
 * because Hibernate's ddl-auto=update never widens an existing MySQL ENUM. Reading is unaffected;
 * persisting one of the three missing values would fail with data truncation. Kept identical to
 * theirs anyway so the two codebases do not drift further apart.
 */
public enum Role implements DisplayableEnum {
    USER("User"),
    ADMIN("Admin"),
    SUPER_ADMIN("Super Admin"),
    MANAGER("Manager"),
    EXECUTIVE("Executive"),
    SELF("Self"),
    CHILD("Child"),
    PARENT("Parent");

    private final String displayName;

    Role(String displayName) {
        this.displayName = displayName;
    }

    @Override
    public String getDisplayName() {
        return displayName;
    }
}
