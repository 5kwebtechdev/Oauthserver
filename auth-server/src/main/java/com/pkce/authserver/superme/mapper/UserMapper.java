package com.pkce.authserver.superme.mapper;

import com.pkce.authserver.superme.dto.FamilyDTO;
import com.pkce.authserver.superme.dto.FamilyMemberDTO;
import com.pkce.authserver.superme.dto.UserDTO;
import com.pkce.authserver.superme.model.Family;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.util.FamilyMembers;

import java.time.LocalDate;
import java.time.Period;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

/** Copied verbatim from SuperMeBE (com.superme.mapper.UserMapper) - builds the login "user" payload. */
public final class UserMapper {

    private UserMapper() {
    }

    public static UserDTO toDto(User user) {
        if (user == null) return null;

        Family family = user.getFamily();
        FamilyDTO familyDTO = null;
        List<FamilyMemberDTO> memberDTOs = new ArrayList<>();

        if (family != null) {
            familyDTO = new FamilyDTO(family.getId(), family.getFamilyCode(), family.getFamilyName());

            if (family.getMembers() != null) {
                memberDTOs = FamilyMembers.active(family).stream()
                        .map(member -> new FamilyMemberDTO(
                                member.getId(),
                                member.getId(),
                                member.getName(),
                                member.getRelationship(),
                                member.getDateOfBirth(),
                                member.getAvatar() != null ? member.getAvatar().getAvatarImageName() : null,
                                FamilyMembers.isCoParent(family, member)
                        ))
                        .collect(Collectors.toList());
            }
        }

        return new UserDTO(
                user.getId(),
                user.getName(),
                user.getUsername(),
                user.getEmail(),
                user.getPhone(),
                user.getGender(),
                user.getDateOfBirth(),
                calculateAge(user.getDateOfBirth()),
                user.getRelationship(),
                user.getRole(),
                user.getReferralCode(),
                user.getOnboardingStep(),
                familyDTO,
                memberDTOs,
                user.getAvatar(),
                user.getPet(),
                user.getLastDailyBonusDate(),
                user.getAsChild(),
                user.getCoins()
        );
    }

    private static Integer calculateAge(LocalDate dateOfBirth) {
        if (dateOfBirth == null) return null;
        LocalDate today = LocalDate.now();
        int years = Period.between(dateOfBirth, today).getYears();
        return Math.max(years, 0);
    }
}
