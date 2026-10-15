package com.pkce.authserver.superme.dto;

import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import com.pkce.authserver.superme.model.Avatar;
import com.pkce.authserver.superme.model.Pet;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Copied verbatim from SuperMeBE (com.superme.dto.UserDTO) - the exact shape their /auth/login
 * returns under "user". This is what rides on every /oauth2/token response here, so a client sees
 * the same keys from either backend. See UserInfoAccessTokenResponseCustomizer.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private Long id;
    private String name;
    private String username;
    private String email;
    private String phone;
    private String gender;
    private LocalDate dateOfBirth;
    private Integer age;
    private Relationship relationship;
    private Role role;
    private String referralCode;
    private Integer onboardingStep;
    private FamilyDTO family;
    private List<FamilyMemberDTO> familyMembers;
    private Avatar avatar;
    private Pet pet;
    private LocalDate lastDailyBonusDate;
    private Boolean asChild;
    private Integer coins;
    /** Authentication provider used by the account, exposed so clients can resume social onboarding. */
    private String authProvider;
}
