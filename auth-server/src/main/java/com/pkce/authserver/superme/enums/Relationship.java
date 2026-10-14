package com.pkce.authserver.superme.enums;

/** Copied verbatim from SuperMeBE (com.superme.enums.Relationship). */
public enum Relationship implements DisplayableEnum {
    CHILD("Child"),
    PARENT("Parent"),
    SELF("Self");

    private final String displayName;

    Relationship(String displayName) {
        this.displayName = displayName;
    }

    @Override
    public String getDisplayName() {
        return displayName;
    }
}
