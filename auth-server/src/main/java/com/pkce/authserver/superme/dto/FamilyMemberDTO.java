package com.pkce.authserver.superme.dto;

import com.pkce.authserver.superme.enums.Relationship;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/** Copied verbatim from SuperMeBE (com.superme.dto.FamilyMemberDTO). */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class FamilyMemberDTO {
    private Long id;
    private Long userId;
    private String name;
    private Relationship relationship;
    private LocalDate dateOfBirth;
    private String avatarImageName;
    /** true for a PARENT who joined the family (did not create it); relationship stays PARENT. */
    private boolean coParent;
}
