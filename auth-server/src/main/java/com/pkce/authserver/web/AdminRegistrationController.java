package com.pkce.authserver.web;

import com.pkce.authserver.admin.model.Admin;
import com.pkce.authserver.service.AdminRegistrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Creates new admin-panel staff accounts in mindfullAdmin.Admin so the admin FE's "invite a
 * teammate" flow can be served by this auth server instead of SuperMeBE, once ADMIN_WRITES_ENABLED
 * is turned on (see AdminRegistrationService). Reachable only under /api/admin/**, which
 * AdminApiSecurityConfig already restricts to a valid Bearer token carrying ROLE_ADMIN; this
 * controller additionally requires ROLE_SUPER_ADMIN specifically, matching SuperMeBE's own
 * registerAdmin policy ("Only Super admin can register new admins").
 *
 * Does not replace SuperMeBE's bootstrap-admin path (admin/AdminAuth/register with
 * adminRepository.count() == 0) - creating the very first admin account still happens there,
 * unaffected by anything in this server.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRegistrationController {

    private final AdminRegistrationService adminRegistrationService;

    @PostMapping("/admins")
    public ResponseEntity<Map<String, Object>> createAdmin(@Valid @RequestBody CreateAdminRequest request,
                                                             Authentication authentication) {
        boolean isSuperAdmin = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch("ROLE_SUPER_ADMIN"::equals);
        if (!isSuperAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only a super admin can create admin accounts");
        }

        Admin created = adminRegistrationService.createAdmin(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "id", created.getId(),
                "email", created.getEmail(),
                "role", created.getRole().name()
        ));
    }
}
