package com.pkce.authserver.web;

import com.pkce.authserver.repository.SecurityEventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** ROLE_ADMIN-gated via AdminApiSecurityConfig's /api/admin/** matcher - no separate security wiring needed here. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class SecurityEventsController {

    private final SecurityEventRepository securityEventRepository;

    @GetMapping("/security-events")
    public List<SecurityEventResponse> listRecent() {
        return securityEventRepository.findTop200ByOrderByCreatedAtDesc().stream()
                .map(SecurityEventResponse::from)
                .toList();
    }
}
