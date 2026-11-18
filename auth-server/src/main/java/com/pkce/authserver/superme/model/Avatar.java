package com.pkce.authserver.superme.model;

import com.pkce.authserver.superme.converter.UserGenderIdConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Copied from SuperMeBE (com.superme.model.Avatar). gender now resolves through the gender master table. */
@Entity
@Table(name = "Avatar")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Avatar {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "avatar_id")
    private Integer id;

    @Column(nullable = false, unique = true, length = 100)
    private String avatarName;

    @Convert(converter = UserGenderIdConverter.class)
    @Column(name = "gender_id")
    private String gender;

    private String url;

    private String avatarImageName;

    @Column(nullable = false)
    private boolean renamedByUser = false;
}
