package com.pkce.authserver.repository;

import com.pkce.authserver.entity.SecurityEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SecurityEventRepository extends JpaRepository<SecurityEvent, Long> {

    List<SecurityEvent> findTop200ByOrderByCreatedAtDesc();
}
