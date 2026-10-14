package com.pkce.authserver.compat.dto;

import com.pkce.authserver.superme.enums.AgeGroup;
import com.pkce.authserver.superme.enums.Relationship;
import com.pkce.authserver.superme.enums.Role;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Copied verbatim from SuperMeBE (com.superme.dto.UserResponseDto) - the body their /auth/register
 * returns. Deliberately NOT the same shape as the login payload (superme.dto.UserDTO): their
 * register answers with this flat view and their login with the nested one, and a client written
 * against the real API depends on both being exactly as they are.
 *
 * isLoggedIn/emailVerified/enabled/lastLoginDate are never populated by the mapper, exactly as in
 * theirs, so they serialize as false/null regardless of the stored row. That is why a freshly
 * registered account comes back with "enabled": false even though the row is enabled.
 */
@Data
@Builder
public class UserResponseDto {

    private Long id;
    private String name;
    private String username;
    private String email;
    private String phone;

    private Role role;
    private Relationship relationship;

    private boolean isLoggedIn;
    private boolean emailVerified;
    private boolean enabled;
    private Integer onboardingStep;

    private String gender;
    private LocalDate dateOfBirth;
    private boolean dobChanged;
    private boolean usernameChanged;

    private int age;
    private AgeGroup ageGroup;

    private int coins;
    private int currentStreak;
    private int highestStreak;

    private LocalDateTime lastLoginDate;
    private LocalDateTime createdDateTime;

    private String avatarName;
    private String avatarImageName;
    private String petName;
    private String familyCode;
    private String familyName;
    private String referralCode;
}
