package com.pkce.authserver.repository;

import com.pkce.authserver.superme.model.Avatar;
import org.springframework.data.jpa.repository.JpaRepository;

/** Registration auto-creates an Avatar per user, same as SuperMeBE's own flow does. */
public interface AvatarRepository extends JpaRepository<Avatar, Long> {

    boolean existsByAvatarNameIgnoreCase(String avatarName);
}
