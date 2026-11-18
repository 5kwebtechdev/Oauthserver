package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.Pet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

/** Pets are find-or-create during registration, so an unknown name never produces a 404. */
public interface PetRepository extends JpaRepository<Pet, Long> {

    Optional<Pet> findByPetName(String petName);

    Optional<Pet> findByUrl(String url);
}
