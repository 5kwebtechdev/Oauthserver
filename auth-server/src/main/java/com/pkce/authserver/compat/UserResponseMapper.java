package com.pkce.authserver.compat;

import com.pkce.authserver.compat.dto.UserResponseDto;
import com.pkce.authserver.superme.model.User;

import java.time.LocalDate;
import java.time.Period;

/**
 * Copied from SuperMeBE's UserService.mapUserToDto - the body their /auth/register answers with.
 * Note which fields it does NOT copy (isLoggedIn, emailVerified, enabled, lastLoginDate): that is
 * theirs, not an omission, and it is why a newly registered account reports "enabled": false.
 */
public final class UserResponseMapper {

    private UserResponseMapper() {
    }

    public static UserResponseDto mapUserToDto(User user) {
        if (user == null) return null;

        return UserResponseDto.builder()
                .id(user.getId())
                .name(user.getName())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .coins(user.getCoins())
                .currentStreak(user.getCurrentStreak())
                .highestStreak(user.getHighestStreak())
                .phone(user.getPhone())
                .gender(user.getGender())
                .onboardingStep(user.getOnboardingStep())
                .dateOfBirth(user.getDateOfBirth())
                .dobChanged(user.isDobChanged())
                .usernameChanged(user.isUsernameChanged())
                .age(calculateAge(user.getDateOfBirth()))
                .ageGroup(user.getAgeGroup())
                .avatarName(user.getAvatar() != null ? user.getAvatar().getAvatarName() : null)
                .avatarImageName(user.getAvatar() != null ? user.getAvatar().getAvatarImageName() : null)
                .petName(user.getPet() != null ? user.getPet().getPetName() : null)
                .relationship(user.getRelationship())
                .createdDateTime(user.getCreatedDateTime())
                .familyCode(user.getFamily() != null ? user.getFamily().getFamilyCode() : null)
                .familyName(user.getFamily() != null ? user.getFamily().getFamilyName() : null)
                .referralCode(user.getReferralCode())
                .build();
    }

    private static int calculateAge(LocalDate dateOfBirth) {
        if (dateOfBirth == null) return 0;
        return Math.max(Period.between(dateOfBirth, LocalDate.now()).getYears(), 0);
    }
}
