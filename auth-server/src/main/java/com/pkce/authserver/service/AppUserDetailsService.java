package com.pkce.authserver.service;

import com.pkce.authserver.admin.model.Admin;
import com.pkce.authserver.admin.model.AdminAccountStatus;
import com.pkce.authserver.admin.model.AdminPassword;
import com.pkce.authserver.admin.repository.AdminRepository;
import com.pkce.authserver.admindev.model.AdminDev;
import com.pkce.authserver.admindev.model.AdminDevAccountStatus;
import com.pkce.authserver.admindev.model.AdminPasswordDev;
import com.pkce.authserver.admindev.repository.AdminDevRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.security.AdminLoginContextFilter;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.Set;

/**
 * Authenticates against SuperMeBE's live User + UserPassword tables.
 *
 * The identifier is an email or a phone number, not a username - see SupermeUserLookup. Everything
 * password-related still goes through Spring Security's DaoAuthenticationProvider, so the existing
 * BCrypt encoder, the failure events that drive lockout, and the authorization-code flow are all
 * unchanged; only where the user and hash come from is different.
 *
 * Two behaviours are matched to their UserService.login deliberately:
 *   - a user with no UserPassword row (131 of the 458 live users) must fail as bad credentials, not
 *     blow up, so an empty hash would be wrong - the row is required to authenticate at all;
 *   - a soft-deleted account (deleted = true) is refused, which is modelled as "disabled" here so
 *     DaoAuthenticationProvider produces it without reimplementing the check.
 *
 * Admin-panel login (added): if the pending authorization is for an admin client
 * (AdminLoginContextFilter.currentAdminClient), only the matching Admin table is ever consulted
 * (same BCrypt scheme as SuperMeBE's admin AuthService) - mindfullP1.User is skipped entirely, so
 * a regular SuperMeApp end-user account can never successfully authenticate into an admin-client
 * session just because its credentials happen to be valid. PROD checks mindfullAdmin via
 * AdminRepository; DEV checks SuperMeBE's dev admin database via AdminDevRepository - these are
 * two genuinely different physical databases (see AdminDevDataSourceConfig), not just different
 * client ids reading the same data. For every other (non-admin) client, behavior is unchanged:
 * User first, falling back to the prod Admin table only if not found there.
 */
@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final SupermeUserLookup userLookup;
    private final UserPasswordRepository userPasswordRepository;
    private final LoginAttemptService loginAttemptService;
    private final AdminRepository adminRepository;
    private final AdminDevRepository adminDevRepository;

    /**
     * A password that no PasswordEncoder can ever match, for the login paths where a password was
     * never involved. BCryptPasswordEncoder.matches returns false for anything that isn't a BCrypt
     * hash, so this cannot be authenticated against - it only exists because UserDetails requires
     * a non-null password.
     */
    private static final String UNUSABLE_PASSWORD = "unusable-no-password-login";

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        AdminLoginContextFilter.AdminClient adminClient = AdminLoginContextFilter.currentAdminClient();
        if (adminClient == AdminLoginContextFilter.AdminClient.DEV) {
            return loadAdminDevByIdentifier(identifier);
        }
        if (adminClient == AdminLoginContextFilter.AdminClient.PROD) {
            return loadAdminByIdentifier(identifier);
        }

        Optional<User> user = userLookup.findByIdentifier(identifier);
        if (user.isPresent()) {
            String passwordHash = userPasswordRepository.findByUser(user.get())
                    .map(UserPassword::getPassword)
                    .orElseThrow(() -> new UsernameNotFoundException("User has no password set: " + identifier));

            return toUserDetails(user.get(), identifier, passwordHash);
        }

        return loadAdminByIdentifier(identifier);
    }

    private UserDetails loadAdminByIdentifier(String identifier) {
        Admin admin = adminRepository.findByEmail(identifier)
                .or(() -> adminRepository.findByPhone(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

        String passwordHash = Optional.ofNullable(admin.getPassword())
                .map(AdminPassword::getHashedPassword)
                .filter(hash -> hash != null && !hash.isBlank())
                .orElseThrow(() -> new UsernameNotFoundException("Admin has no password set: " + identifier));

        boolean deleted = Boolean.TRUE.equals(admin.getDeleted());
        boolean inactive = admin.getStatus() != AdminAccountStatus.ACTIVE;
        boolean expired = admin.getExpiryDate() != null
                && admin.getExpiryDate().isBefore(java.time.LocalDateTime.now());
        return org.springframework.security.core.userdetails.User.builder()
                .username(identifier)
                .password(passwordHash)
                .disabled(deleted || inactive)
                .accountExpired(expired)
                .authorities(Set.of(new SimpleGrantedAuthority("ROLE_" + admin.getRole().name())))
                .build();
    }

    /** Dev-database counterpart of loadAdminByIdentifier - see class Javadoc. */
    private UserDetails loadAdminDevByIdentifier(String identifier) {
        AdminDev admin = adminDevRepository.findByEmail(identifier)
                .or(() -> adminDevRepository.findByPhone(identifier))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + identifier));

        String passwordHash = Optional.ofNullable(admin.getPassword())
                .map(AdminPasswordDev::getHashedPassword)
                .filter(hash -> hash != null && !hash.isBlank())
                .orElseThrow(() -> new UsernameNotFoundException("Admin has no password set: " + identifier));

        boolean deleted = Boolean.TRUE.equals(admin.getDeleted());
        boolean inactive = admin.getStatus() != AdminDevAccountStatus.ACTIVE;
        boolean expired = admin.getExpiryDate() != null
                && admin.getExpiryDate().isBefore(java.time.LocalDateTime.now());
        return org.springframework.security.core.userdetails.User.builder()
                .username(identifier)
                .password(passwordHash)
                .disabled(deleted || inactive)
                .accountExpired(expired)
                .authorities(Set.of(new SimpleGrantedAuthority("ROLE_" + admin.getRole().name())))
                .build();
    }

    /**
     * For Google and continue-with-email, which have already proven who the user is by other means
     * and need a UserDetails only to establish the session (see SessionLoginHelper). Deliberately
     * does not require a UserPassword row: 131 of the live accounts have none, and demanding one
     * here would lock exactly those users out of the very flows that don't use a password.
     */
    @Transactional
    public UserDetails loadVerifiedUser(User user) {
        String identifier = GoogleLoginService.loginIdentifierOf(user);
        if (identifier == null) {
            // User.email and User.phone are both nullable over there, and a row with neither
            // cannot be logged in as: there would be nothing to put in the token subject that
            // could be resolved back to this user afterwards.
            throw new UsernameNotFoundException("Account " + user.getId() + " has no email or phone to sign in with");
        }
        return toUserDetails(user, identifier, UNUSABLE_PASSWORD);
    }

    private UserDetails toUserDetails(User user, String username, String password) {
        boolean deleted = Boolean.TRUE.equals(user.getDeleted());
        return org.springframework.security.core.userdetails.User.builder()
                .username(username)
                .password(password)
                .disabled(!user.isEnabled() || deleted)
                .accountLocked(loginAttemptService.isLocked(user.getId()))
                .authorities(Set.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())))
                .build();
    }

}
