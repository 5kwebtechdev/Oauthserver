package com.pkce.authserver.superme.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * User's fields now live across several secondary tables (user_profile, user_wallet,
 * user_streak, ...). A missing row or a NULL column must not crash loading a primitive field, so
 * NULL is read as the primitive default (0 / false / 0.0).
 */
public final class NullSafeConverters {

    private NullSafeConverters() {
    }

    @Converter
    public static class IntConverter implements AttributeConverter<Integer, Integer> {
        @Override public Integer convertToDatabaseColumn(Integer attribute) { return attribute; }
        @Override public Integer convertToEntityAttribute(Integer dbData) { return dbData == null ? 0 : dbData; }
    }

    @Converter
    public static class BooleanConverter implements AttributeConverter<Boolean, Boolean> {
        @Override public Boolean convertToDatabaseColumn(Boolean attribute) { return attribute; }
        @Override public Boolean convertToEntityAttribute(Boolean dbData) { return dbData != null && dbData; }
    }

    @Converter
    public static class DoubleConverter implements AttributeConverter<Double, Double> {
        @Override public Double convertToDatabaseColumn(Double attribute) { return attribute; }
        @Override public Double convertToEntityAttribute(Double dbData) { return dbData == null ? 0.0 : dbData; }
    }

    // user_profile.age is TINYINT UNSIGNED (confirmed via information_schema against the live
    // dev DB), not INT - human ages fit comfortably in a signed Byte's 0-127 range either way.
    @Converter
    public static class AgeConverter implements AttributeConverter<Integer, Byte> {
        @Override public Byte convertToDatabaseColumn(Integer attribute) {
            return attribute == null ? null : attribute.byteValue();
        }
        @Override public Integer convertToEntityAttribute(Byte dbData) {
            return dbData == null ? 0 : Byte.toUnsignedInt(dbData);
        }
    }
}
