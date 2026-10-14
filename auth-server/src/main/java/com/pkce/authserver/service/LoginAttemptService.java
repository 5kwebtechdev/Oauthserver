package com.pkce.authserver.service;

import com.pkce.authserver.config.AccountLockoutProperties;
import com.pkce.authserver.entity.LoginAttempt;
import com.pkce.authserver.repository.LoginAttemptRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Account-level brute-force lockout, in one place so every password-checking entry point gets the
 * same behaviour.
 *
 * It exists because there is more than one such entry point: the form login goes through Spring
 * Security's AuthenticationManager (and so through LoginAttemptListener's events), while the
 * SuperMeBE-compatible /v1/auth/login compares the hash itself and publishes no events at all.
 * That second path originally had no lockout - per-IP rate limiting still applied, but rate
 * limiting is per IP and lockout is per account, so an attacker spreading guesses across addresses
 * was bounded by neither.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LoginAttemptService {

    private final LoginAttemptRepository loginAttemptRepository;
    private final AccountLockoutProperties lockoutProperties;
    private final SecurityEventService securityEventService;

    /**
     * Whether this account is currently locked. Expired locks are cleared lazily here rather than
     * by a scheduled job - the next lookup after the lock runs out is what unlocks it.
     */
    @Transactional
    public boolean isLocked(Long userId) {
        Optional<LoginAttempt> found = loginAttemptRepository.findById(userId);
        if (found.isEmpty()) {
            return false;
        }
        LoginAttempt attempt = found.get();
        if (attempt.isAccountNonLocked()) {
            return false;
        }
        if (attempt.getLockedUntil() != null && attempt.getLockedUntil().isBefore(LocalDateTime.now())) {
            attempt.setAccountNonLocked(true);
            attempt.setFailedAttempts(0);
            attempt.setLockedUntil(null);
            loginAttemptRepository.save(attempt);
            return false;
        }
        return true;
    }

    /** Counts a wrong password and locks the account once the configured threshold is reached. */
    @Transactional
    public void recordFailure(Long userId, String identifier, String ip) {
        LoginAttempt attempt = loginAttemptRepository.findById(userId)
                .orElseGet(() -> new LoginAttempt(userId));

        int attempts = attempt.getFailedAttempts() + 1;
        attempt.setFailedAttempts(attempts);

        boolean justLocked = false;
        if (attempts >= lockoutProperties.getMaxAttempts() && attempt.isAccountNonLocked()) {
            attempt.setAccountNonLocked(false);
            attempt.setLockedUntil(LocalDateTime.now().plusMinutes(lockoutProperties.getLockoutDurationMinutes()));
            justLocked = true;
            log.warn("Account '{}' locked for {} minutes after {} failed login attempts",
                    identifier, lockoutProperties.getLockoutDurationMinutes(), attempts);
        }
        loginAttemptRepository.save(attempt);

        securityEventService.record(SecurityEventType.LOGIN_FAILURE, identifier, ip,
                "attempt " + attempts + "/" + lockoutProperties.getMaxAttempts());
        if (justLocked) {
            securityEventService.record(SecurityEventType.ACCOUNT_LOCKED, identifier, ip,
                    "locked for " + lockoutProperties.getLockoutDurationMinutes() + " minutes");
        }
    }

    /** Clears the counter after a correct password, so a lockout needs consecutive failures. */
    @Transactional
    public void recordSuccess(Long userId) {
        loginAttemptRepository.findById(userId).ifPresent(attempt -> {
            if (attempt.getFailedAttempts() > 0 || !attempt.isAccountNonLocked()) {
                attempt.setFailedAttempts(0);
                attempt.setAccountNonLocked(true);
                attempt.setLockedUntil(null);
                loginAttemptRepository.save(attempt);
            }
        });
    }
}
