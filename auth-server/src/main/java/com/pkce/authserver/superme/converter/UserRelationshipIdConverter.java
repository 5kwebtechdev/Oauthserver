package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.Relationship;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Maps user_profile.relationship_id <-> Relationship. Values verified directly against the live
 * dev DB's master_relationships table: 1=CHILD, 2=PARENT, 3=SELF. Column type is INT, not TINYINT.
 */
@Converter(autoApply = false)
public class UserRelationshipIdConverter implements AttributeConverter<Relationship, Integer> {
    @Override
    public Integer convertToDatabaseColumn(Relationship value) {
        if (value == null) return null;
        return switch (value) {
            case CHILD -> 1;
            case PARENT -> 2;
            case SELF -> 3;
        };
    }

    @Override
    public Relationship convertToEntityAttribute(Integer id) {
        if (id == null) return null;
        return switch (id) {
            case 1 -> Relationship.CHILD;
            case 2 -> Relationship.PARENT;
            case 3 -> Relationship.SELF;
            default -> throw new IllegalArgumentException("Unknown Relationship master ID: " + id);
        };
    }
}
