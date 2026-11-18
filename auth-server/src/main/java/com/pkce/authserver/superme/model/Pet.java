package com.pkce.authserver.superme.model;

import com.pkce.authserver.superme.converter.UserGenderIdConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Copied from SuperMeBE (com.superme.model.Pet). gender now resolves through the gender master table. */
@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "pet_id")
    private Integer id;

    @Column(name = "petName", nullable = false, length = 100)
    private String petName;

    @Convert(converter = UserGenderIdConverter.class)
    @Column(name = "gender_id")
    private String gender;

    @Column(name = "url", length = 255)
    private String url;
}
