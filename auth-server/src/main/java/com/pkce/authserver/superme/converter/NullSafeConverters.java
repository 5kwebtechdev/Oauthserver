package com.pkce.authserver.superme.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Copied verbatim from SuperMeBE (com.superme.converter.NullSafeConverters). Many User/listing
 * fields live in optional secondary tables (user_profile, user_wallet, user_streak, ...). A
 * missing row or a NULL column must not crash loading a primitive field, so NULL is read as the
 * primitive default (0 / false / 0.0).
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
    public static class LongConverter implements AttributeConverter<Long, Long> {
        @Override public Long convertToDatabaseColumn(Long attribute) { return attribute; }
        @Override public Long convertToEntityAttribute(Long dbData) { return dbData == null ? 0L : dbData; }
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
}
