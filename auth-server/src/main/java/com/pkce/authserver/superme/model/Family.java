package com.pkce.authserver.superme.model;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Transient;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * Copied from SuperMeBE (com.superme.model.Family), minus its {@code familyMembers} list: that
 * maps the separate FamilyMember entity, which the login response never reads (UserMapper only
 * walks {@code family.getMembers()}). Being a mappedBy collection it owns no column on this table,
 * so leaving it out changes nothing about the mapping.
 */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Family {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String familyCode;

    @Column(nullable = false)
    private String familyName;

    @OneToMany(mappedBy = "family", cascade = CascadeType.ALL)
    @JsonManagedReference
    private List<User> members;

    @Transient
    private String joinToken;

    @Column(nullable = true)
    private Long createdBy;

    @Column(nullable = false)
    private LocalDate createdAt;

    public static String generateFamilyName(String mainUserName) {
        if (mainUserName == null || mainUserName.isBlank()) {
            return "Family";
        }
        return mainUserName.trim() + "'s Family";
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDate.now();
    }
}
