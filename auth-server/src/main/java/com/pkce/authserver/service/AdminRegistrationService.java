package com.pkce.authserver.service;

import com.pkce.authserver.admindev.model.AdminDev;
import com.pkce.authserver.admindev.model.AdminDevAccountStatus;
import com.pkce.authserver.admindev.model.AdminPasswordDev;
import com.pkce.authserver.admindev.repository.AdminDevRepository;
import com.pkce.authserver.admindev.repository.AdminPasswordDevRepository;
import com.pkce.authserver.superme.enums.Role;
import com.pkce.authserver.web.CreateAdminRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE;

/**
 * Creates admin-panel staff accounts directly against this deployment's Admin/AdminPassword
 * tables (superme_db_admin), the same table and BCrypt scheme SuperMeBE's own admin
 * AuthService.registerAdmin uses. Off by default (app.admin.writes-enabled /
 * ADMIN_WRITES_ENABLED), mirroring SupermeProperties' writes-enabled flag for the User table:
 * this server can authenticate and issue tokens for every existing admin without this flag, and
 * only needs it turned on where creating NEW admin accounts through this server is actually
 * wanted.
 *
 * Caller authorization (SUPER_ADMIN, or bootstrap when no admin exists yet) is enforced by
 * AdminRegistrationController, same policy as SuperMeBE's registerAdmin.
 */
@Service
@RequiredArgsConstructor
public class AdminRegistrationService {

    private final AdminDevRepository adminRepository;
    private final AdminPasswordDevRepository adminPasswordRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.writes-enabled:false}")
    private boolean writesEnabled;

    @Transactional("adminTransactionManager")
    public AdminDev createAdmin(CreateAdminRequest request) {
        if (!writesEnabled) {
            throw new ResponseStatusException(SERVICE_UNAVAILABLE,
                    "Admin account creation is disabled on this server (ADMIN_WRITES_ENABLED=false)");
        }

        if (adminRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "Email already in use");
        }
        if (request.getPhone() != null && !request.getPhone().isBlank()
                && adminRepository.findByPhone(request.getPhone()).isPresent()) {
            throw new ResponseStatusException(CONFLICT, "Phone number already in use");
        }

        Role role;
        try {
            role = Role.valueOf(request.getRole().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(BAD_REQUEST, "Unknown role: " + request.getRole());
        }

        AdminPasswordDev password = new AdminPasswordDev();
        password.setHashedPassword(passwordEncoder.encode(request.getPassword()));
        password.setCreatedAt(LocalDateTime.now());
        password.setActive(true);
        adminPasswordRepository.save(password);

        AdminDev admin = new AdminDev();
        admin.setFullName(request.getFullName());
        admin.setEmail(request.getEmail());
        admin.setPhone(request.getPhone());
        admin.setDepartment(request.getDepartment());
        admin.setDesignation(request.getDesignation());
        admin.setRole(role);
        admin.setStatus(AdminDevAccountStatus.ACTIVE);
        admin.setDeleted(false);
        admin.setCreatedAt(LocalDateTime.now());
        admin.setPassword(password);
        return adminRepository.save(admin);
    }
}
