package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.Role;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Maps user_access.role_id <-> Role. Values verified directly against the live dev DB's
 * master_roles table: 1=USER, 2=ADMIN, 3=SUPER_ADMIN, 4=MANAGER, 5=EXECUTIVE, 6=SELF, 7=CHILD,
 * 8=PARENT. Column type is INT, not TINYINT.
 */
@Converter(autoApply = false)
public class UserRoleIdConverter implements AttributeConverter<Role, Integer> {
    @Override
    public Integer convertToDatabaseColumn(Role value) {
        if (value == null) return null;
        return switch (value) {
            case USER -> 1;
            case ADMIN -> 2;
            case SUPER_ADMIN -> 3;
            case MANAGER -> 4;
            case EXECUTIVE -> 5;
            case SELF -> 6;
            case CHILD -> 7;
            case PARENT -> 8;
        };
    }

    @Override
    public Role convertToEntityAttribute(Integer id) {
        if (id == null) return null;
        return switch (id) {
            case 1 -> Role.USER;
            case 2 -> Role.ADMIN;
            case 3 -> Role.SUPER_ADMIN;
            case 4 -> Role.MANAGER;
            case 5 -> Role.EXECUTIVE;
            case 6 -> Role.SELF;
            case 7 -> Role.CHILD;
            case 8 -> Role.PARENT;
            default -> throw new IllegalArgumentException("Unknown Role master ID: " + id);
        };
    }
}
