package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.AgeGroup;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Mirrors SuperMeBE's com.superme.converter.UserAgeGroupIdConverter, same master IDs. */
@Converter(autoApply = false)
public class UserAgeGroupIdConverter implements AttributeConverter<AgeGroup, Byte> {
    @Override
    public Byte convertToDatabaseColumn(AgeGroup value) {
        if (value == null) return null;
        return switch (value.canonical()) {
            case BELOW_11 -> (byte) 1;
            case AGE_11_TO_13 -> (byte) 2;
            case AGE_14_TO_15 -> (byte) 3;
            case AGE_16_TO_17 -> (byte) 4;
            case AGE_18_TO_29 -> (byte) 5;
            case AGE_30_PLUS -> (byte) 6;
            case PARENTS -> (byte) 7;
            case ALL -> (byte) 8;
            default -> throw new IllegalArgumentException("Unexpected canonical AgeGroup: " + value);
        };
    }

    @Override
    public AgeGroup convertToEntityAttribute(Byte id) {
        if (id == null) return null;
        return switch (Byte.toUnsignedInt(id)) {
            case 1 -> AgeGroup.BELOW_11;
            case 2 -> AgeGroup.AGE_11_TO_13;
            case 3 -> AgeGroup.AGE_14_TO_15;
            case 4 -> AgeGroup.AGE_16_TO_17;
            case 5 -> AgeGroup.AGE_18_TO_29;
            case 6 -> AgeGroup.AGE_30_PLUS;
            case 7 -> AgeGroup.PARENTS;
            case 8 -> AgeGroup.ALL;
            case 9 -> AgeGroup.AGE_30_PLUS; // legacy AGE_18_PLUS alias
            case 10 -> AgeGroup.AGE_18_TO_29; // legacy AGE_18_TO_24 alias
            default -> throw new IllegalArgumentException("Unknown AgeGroup master ID: " + Byte.toUnsignedInt(id));
        };
    }
}
