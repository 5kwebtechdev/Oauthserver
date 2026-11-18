package com.pkce.authserver.superme.converter;

import com.pkce.authserver.superme.enums.AgeGroup;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * Maps user_profile.age_group_id <-> AgeGroup. Values verified directly against the live dev
 * DB's master_age_groups table: 1=BELOW_11, 2=AGE_11_TO_13, 3=AGE_14_TO_15, 4=AGE_16_TO_17,
 * 5=AGE_18_TO_29, 6=AGE_30_PLUS, 7=PARENTS, 8=ALL, 9=AGE_18_PLUS (legacy), 10=AGE_18_TO_24
 * (legacy). Column type is INT, not TINYINT.
 *
 * The master table also has 11="Teens (13-18)" and 12="Adults", with no corresponding AgeGroup
 * enum value and no live user_profile row currently using either (confirmed via
 * "SELECT age_group_id, COUNT(*) FROM user_profile GROUP BY age_group_id" - only 1-6 appear) -
 * left unhandled rather than guessed at.
 */
@Converter(autoApply = false)
public class UserAgeGroupIdConverter implements AttributeConverter<AgeGroup, Integer> {
    @Override
    public Integer convertToDatabaseColumn(AgeGroup value) {
        if (value == null) return null;
        return switch (value) {
            case BELOW_11 -> 1;
            case AGE_11_TO_13 -> 2;
            case AGE_14_TO_15 -> 3;
            case AGE_16_TO_17 -> 4;
            case AGE_18_TO_29 -> 5;
            case AGE_30_PLUS -> 6;
            case PARENTS -> 7;
            case ALL -> 8;
            case AGE_18_PLUS -> 9;
            case AGE_18_TO_24 -> 10;
            case AGE_25_PLUS -> 9; // legacy alias, same bucket as AGE_18_PLUS
        };
    }

    @Override
    public AgeGroup convertToEntityAttribute(Integer id) {
        if (id == null) return null;
        return switch (id) {
            case 1 -> AgeGroup.BELOW_11;
            case 2 -> AgeGroup.AGE_11_TO_13;
            case 3 -> AgeGroup.AGE_14_TO_15;
            case 4 -> AgeGroup.AGE_16_TO_17;
            case 5 -> AgeGroup.AGE_18_TO_29;
            case 6 -> AgeGroup.AGE_30_PLUS;
            case 7 -> AgeGroup.PARENTS;
            case 8 -> AgeGroup.ALL;
            case 9 -> AgeGroup.AGE_18_PLUS;
            case 10 -> AgeGroup.AGE_18_TO_24;
            default -> throw new IllegalArgumentException("Unknown AgeGroup master ID: " + id);
        };
    }
}
