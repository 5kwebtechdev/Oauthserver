package com.pkce.authserver.superme.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Locale;
import java.util.Set;

/**
 * Age bands shared with SuperMeBE. Older database rows and clients may still contain
 * AGE_18_TO_24, AGE_18_PLUS, or AGE_25_PLUS; fromValue maps those values to the current bands.
 *
 * PARENTS and ALL are absent from the live mindfullP1 `User.ageGroup` ENUM column (same
 * ddl-auto=update drift described on {@link Role}). fromAge never returns either of them, so the
 * @PreUpdate recompute on User cannot produce a value the column rejects.
 */
public enum AgeGroup implements DisplayableEnum {
    BELOW_11("Below 11"),
    AGE_11_TO_13("11-13"),
    AGE_14_TO_15("14-15"),
    AGE_16_TO_17("16-17"),
    AGE_18_TO_29("18-29"),
    AGE_30_PLUS("30+"),
    // Retained so Hibernate can read older persisted values; User.getAgeGroup canonicalizes them.
    AGE_18_TO_24("18-24"),
    AGE_18_PLUS("18+"),
    AGE_25_PLUS("25+"),
    PARENTS("Parents"),

    ALL("All Age Groups");

    private final String displayName;

    AgeGroup(String displayName) {
        this.displayName = displayName;
    }

    @Override
    public String getDisplayName() {
        return displayName;
    }

    public AgeGroup canonical() {
        return switch (this) {
            case AGE_18_TO_24 -> AGE_18_TO_29;
            case AGE_18_PLUS, AGE_25_PLUS -> AGE_30_PLUS;
            default -> this;
        };
    }

    @JsonValue
    public String getApiValue() {
        return name();
    }

    @JsonCreator
    public static AgeGroup fromValue(String value) {
        if (value == null) return null;
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (Set.of("AGE_18_TO_24", "18-24", "18TO29").contains(normalized)) return AGE_18_TO_29;
        if (Set.of("AGE_18_PLUS", "AGE_25_PLUS", "18+", "25+").contains(normalized)) return AGE_30_PLUS;
        for (AgeGroup group : values()) {
            if (group.displayName.equalsIgnoreCase(value.trim())) return group;
        }
        return valueOf(normalized);
    }

    public static AgeGroup fromAge(int age) {
        if (age < 11) {
            return BELOW_11;
        } else if (age <= 13) {
            return AGE_11_TO_13;
        } else if (age <= 15) {
            return AGE_14_TO_15;
        } else if (age <= 17) {
            return AGE_16_TO_17;
        } else if (age <= 29) {
            return AGE_18_TO_29;
        } else {
            return AGE_30_PLUS;
        }
    }
}
