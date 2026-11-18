package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/** Copied from SuperMeBE (com.superme.converter.UserRoleIdConverter). */
@Converter(autoApply = false)
public class UserRoleIdConverter implements AttributeConverter<Role, Byte> {
    @Override
    public Byte convertToDatabaseColumn(Role value) {
        if (value == null) return null;
        return switch (value) {
            case USER -> (byte) 1;
            case ADMIN -> (byte) 2;
            case SUPER_ADMIN -> (byte) 3;
            case MANAGER -> (byte) 4;
            case EXECUTIVE -> (byte) 5;
            case SELF -> (byte) 6;
            case CHILD -> (byte) 7;
            case PARENT -> (byte) 8;
        };
    }

    @Override
    public Role convertToEntityAttribute(Byte id) {
        if (id == null) return null;
        return switch (Byte.toUnsignedInt(id)) {
            case 1 -> Role.USER;
            case 2 -> Role.ADMIN;
            case 3 -> Role.SUPER_ADMIN;
            case 4 -> Role.MANAGER;
            case 5 -> Role.EXECUTIVE;
            case 6 -> Role.SELF;
            case 7 -> Role.CHILD;
            case 8 -> Role.PARENT;
            default -> throw new IllegalArgumentException("Unknown Role master ID: " + Byte.toUnsignedInt(id));
        };
    }
}
