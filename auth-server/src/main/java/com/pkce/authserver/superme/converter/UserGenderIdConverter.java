package com.pkce.authserver.superme.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

/**
 * Maps user_profile.gender_id <-> String. Values verified directly against the live dev DB's
 * master_genders table (SELECT * FROM master_genders): 1=MALE, 2=FEMALE, 3=OTHER, 4=ALL - no
 * PREFER_NOT_TO_SAY row exists there, unlike SuperMeBE's own copy of this converter. Column type
 * is INT, not TINYINT.
 */
@Converter(autoApply = false)
public class UserGenderIdConverter implements AttributeConverter<String, Integer> {
    @Override
    public Integer convertToDatabaseColumn(String value) {
        if (value == null) return null;
        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "MALE" -> 1;
            case "FEMALE" -> 2;
            case "OTHER" -> 3;
            case "ALL" -> 4;
            default -> throw new IllegalArgumentException("Unknown gender master value: " + value);
        };
    }

    @Override
    public String convertToEntityAttribute(Integer id) {
        if (id == null) return null;
        return switch (id) {
            case 1 -> "MALE";
            case 2 -> "FEMALE";
            case 3 -> "OTHER";
            case 4 -> "ALL";
            default -> throw new IllegalArgumentException("Unknown gender master ID: " + id);
        };
    }
}
