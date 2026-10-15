package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.AgeGroup;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Normalizes legacy SuperMe age bands while reading the shared User table. In particular,
 * existing rows containing AGE_18_TO_24 must load as the current AGE_18_TO_29 band instead
 * of making Hibernate fail while materializing the User entity.
 */
@Converter
public class AgeGroupConverter implements AttributeConverter<AgeGroup, String> {

    @Override
    public String convertToDatabaseColumn(AgeGroup ageGroup) {
        return ageGroup == null ? null : ageGroup.name();
    }

    @Override
    public AgeGroup convertToEntityAttribute(String storedValue) {
        return storedValue == null ? null : AgeGroup.fromValue(storedValue);
    }
}
