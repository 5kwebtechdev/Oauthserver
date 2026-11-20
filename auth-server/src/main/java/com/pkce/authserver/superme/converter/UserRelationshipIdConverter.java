package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.Relationship;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Mirrors SuperMeBE's com.superme.converter.UserRelationshipIdConverter, same master IDs. */
@Converter(autoApply = false)
public class UserRelationshipIdConverter implements AttributeConverter<Relationship, Byte> {
    @Override
    public Byte convertToDatabaseColumn(Relationship value) {
        if (value == null) return null;
        return switch (value) {
            case CHILD -> (byte) 1;
            case PARENT -> (byte) 2;
            case SELF -> (byte) 3;
        };
    }

    @Override
    public Relationship convertToEntityAttribute(Byte id) {
        if (id == null) return null;
        return switch (Byte.toUnsignedInt(id)) {
            case 1 -> Relationship.CHILD;
            case 2 -> Relationship.PARENT;
            case 3 -> Relationship.SELF;
            default -> throw new IllegalArgumentException("Unknown Relationship master ID: " + Byte.toUnsignedInt(id));
        };
    }
}
