package com.pkce.authserver.web;

import com.pkce.authserver.repository.SupermeUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Admin-only visibility into the SuperMeApp accounts this server can authenticate. Protected by
 * AdminApiSecurityConfig - requires a valid Bearer access token with ROLE_ADMIN, the same tokens
 * this app already issues for the resource-server's /api/admin/notes.
 *
 * Paged, unlike the previous version's findAll(): the live table holds every real user of the app
 * (~458 and growing), so loading all of them to serve one screen is not something to do by
 * default. Read-only transaction so reading a user whose stored age has drifted can't be flushed
 * back as an UPDATE by User's @PreUpdate hook.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUsersController {

    private static final int MAX_PAGE_SIZE = 200;

    private final SupermeUserRepository userRepository;

    @GetMapping("/users")
    @Transactional(readOnly = true)
    public Map<String, Object> listUsers(@RequestParam(name = "page", defaultValue = "0") int page,
                                         @RequestParam(name = "size", defaultValue = "50") int size) {
        int pageSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
        var result = userRepository.findAll(org.springframework.data.domain.PageRequest.of(Math.max(page, 0), pageSize));

        List<AdminUserResponse> users = result.getContent().stream()
                .map(AdminUserResponse::from)
                .toList();

        return Map.of(
                "total", result.getTotalElements(),
                "page", result.getNumber(),
                "size", result.getSize(),
                "totalPages", result.getTotalPages(),
                "users", users
        );
    }
}
