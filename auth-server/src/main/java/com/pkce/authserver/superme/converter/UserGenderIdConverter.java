package com.pkce.authserver.superme.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

import java.util.Locale;

/**
 * Mirrors SuperMeBE's com.superme.converter.UserGenderIdConverter, same master IDs. TINYINT
 * UNSIGNED on the live user_profile.gender_id column, same family as relationship_id/age_group_id.
 */
@Converter(autoApply = false)
public class UserGenderIdConverter implements AttributeConverter<String, Byte> {
    @Override
    public Byte convertToDatabaseColumn(String value) {
        if (value == null) return null;
        return switch (value.trim().toUpperCase(Locale.ROOT)) {
            case "MALE" -> (byte) 1;
            case "FEMALE" -> (byte) 2;
            case "OTHER" -> (byte) 3;
            case "ALL" -> (byte) 4;
            // Google sign-up stores "Not specified" when no gender is shared.
            case "PREFER_NOT_TO_SAY", "NOT SPECIFIED", "NOT_SPECIFIED" -> (byte) 5;
            default -> throw new IllegalArgumentException("Unknown gender master value: " + value);
        };
    }

    @Override
    public String convertToEntityAttribute(Byte id) {
        if (id == null) return null;
        return switch (Byte.toUnsignedInt(id)) {
            case 1 -> "MALE";
            case 2 -> "FEMALE";
            case 3 -> "OTHER";
            case 4 -> "ALL";
            case 5 -> "PREFER_NOT_TO_SAY";
            default -> throw new IllegalArgumentException("Unknown gender master ID: " + Byte.toUnsignedInt(id));
        };
    }
}
