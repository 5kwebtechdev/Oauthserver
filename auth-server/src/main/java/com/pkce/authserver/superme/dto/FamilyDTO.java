package com.pkce.authserver.superme.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Copied verbatim from SuperMeBE (com.superme.dto.FamilyDTO). */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class FamilyDTO {
    private Integer id;
    private String familyCode;
    private String familyName;
}
