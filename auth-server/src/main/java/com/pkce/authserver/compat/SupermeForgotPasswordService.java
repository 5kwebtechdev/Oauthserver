package com.pkce.authserver.compat;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.LoginAttemptRepository;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.service.EmailService;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * SuperMeBE's ForgotPasswordServiceImpl, ported so /v1/auth/forgot-password behaves exactly as the
 * real backend does: a 4-digit code, verification opening a 5-minute window in which the password
 * may be reset, the same password-strength rules, and the same branded reset email
 * (SupermeEmailTemplates). The code's own lifetime is OtpService.EXPIRY_MINUTES - 2 minutes on this
 * deployment, where theirs is 5.
 *
 * Its OTP store is independent of {@link SupermeOtpService}'s, exactly as theirs is - a registration
 * code and a reset code are different things and must not be interchangeable. Both are separate
 * again from this project's own database-backed OtpService behind /api/auth/forgot-password, which
 * stays as it is for the PKCE flows.
 *
 * Unlike theirs, the reset is gated on app.superme.writes-enabled: it rewrites a row in a live
 * production credentials table shared with a running application.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupermeForgotPasswordService {

    private static final int OTP_EXPIRY_MINUTES = SupermeEmailTemplates.OTP_EXPIRY_MINUTES;
    /**
     * Window in which reset-password is allowed after OTP verification (300 s = 5 min). This is
     * theirs and is deliberately NOT the 2-minute code lifetime: the code is what you wait for in
     * your inbox, this is how long you then have to type a new password.
     */
    private static final int VERIFIED_WINDOW_SECONDS = 300;
    /**
     * Wrong guesses before the code is destroyed. Matters more here than anywhere else in the app:
     * a guessed reset code is a full account takeover, and a 4-digit code is only 9000 tries.
     */
    private static final int MAX_ATTEMPTS = 5;

    private final SupermeUserRepository userRepository;
    private final UserPasswordRepository userPasswordRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SupermeProperties supermeProperties;
    private final SecurityEventService securityEventService;

    /** Their ResourceNotFoundException - the controller answers 404 for it. */
    public static class AccountNotFoundException extends RuntimeException {
        public AccountNotFoundException(String message) {
            super(message);
        }
    }

    /** Their BusinessException - the controller answers 400 for it. */
    public static class ResetException extends RuntimeException {
        public ResetException(String message) {
            super(message);
        }
    }

    private record OtpData(String otp, Instant expiresAt, AtomicInteger attempts) {
        OtpData(String otp, Instant expiresAt) {
            this(otp, expiresAt, new AtomicInteger());
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    // Independent OTP store - separate from the registration OTP module
    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    // Tracks emails whose OTP was verified; value = expiry of the reset window
    private final Map<String, Instant> verifiedEmails = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    // API 1: Send OTP

    public void sendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);

        // Validate the email exists before doing anything
        if (userRepository.findByEmail(normalizedEmail).isEmpty()) {
            throw new AccountNotFoundException("No account registered with this email address.");
        }

        // Clear any stale verified state so a previous, unused window cannot be reused
        verifiedEmails.remove(normalizedEmail);

        String otp = generateOtp();
        otpStore.put(normalizedEmail, new OtpData(otp, Instant.now().plusSeconds(OTP_EXPIRY_MINUTES * 60L)));
        log.info("Forgot-password OTP generated for: {}", normalizedEmail);

        emailService.sendHtmlMail(normalizedEmail, SupermeEmailTemplates.RESET_SUBJECT,
                SupermeEmailTemplates.passwordReset(otp));
        log.info("Forgot-password OTP email dispatched to: {}", normalizedEmail);
    }

    // API 2: Verify OTP

    public void verifyOtp(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        OtpData otpData = otpStore.get(normalizedEmail);

        if (otpData == null) {
            throw new ResetException("Your OTP has expired. Please request a new OTP.");
        }
        if (otpData.isExpired()) {
            otpStore.remove(normalizedEmail);
            throw new ResetException("OTP has expired. Please request a new OTP.");
        }
        if (!otpData.otp().equals(otp)) {
            if (otpData.attempts().incrementAndGet() >= MAX_ATTEMPTS) {
                otpStore.remove(normalizedEmail);
                log.warn("Forgot-password OTP guess cap reached for {} - code destroyed", normalizedEmail);
                securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, normalizedEmail, null,
                        "forgot-password: guess cap reached, code destroyed");
                throw new ResetException("Too many incorrect attempts. Please request a new OTP.");
            }
            securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, normalizedEmail, null,
                    "forgot-password: incorrect code");
            throw new ResetException("Invalid OTP. Please check and try again.");
        }

        // Valid - remove OTP and open the 300-second reset window
        otpStore.remove(normalizedEmail);
        verifiedEmails.put(normalizedEmail, Instant.now().plusSeconds(VERIFIED_WINDOW_SECONDS));
        log.info("Forgot-password OTP verified for: {}", normalizedEmail);
    }

    // API 3: Reset Password

    @Transactional
    public void resetPassword(String email, String newPassword) {
        String normalizedEmail = normalizeEmail(email);

        // Ensure OTP was verified recently within the reset window
        Instant windowExpiry = verifiedEmails.get(normalizedEmail);
        if (windowExpiry == null || Instant.now().isAfter(windowExpiry)) {
            verifiedEmails.remove(normalizedEmail);
            throw new ResetException("Password reset session expired. Please verify your OTP again.");
        }

        validatePasswordStrength(newPassword);

        if (!supermeProperties.isWritesEnabled()) {
            throw new ResetException("Password reset is disabled on this server.");
        }

        User user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new AccountNotFoundException("No account registered with this email address."));

        // A User row without a UserPassword row can happen (e.g. account created via a path that
        // never set an initial password) - reset should still succeed by creating it here rather
        // than failing, since setting the password is exactly what this endpoint is for.
        UserPassword userPassword = userPasswordRepository.findByUser(user)
                .orElseGet(() -> UserPassword.builder().user(user).build());

        userPassword.setPassword(passwordEncoder.encode(newPassword));
        userPasswordRepository.save(userPassword);

        // Not in theirs, because they have no lockout: a verified-by-email reset is at least as
        // strong a proof of ownership as a correct password, so it doubles as the recovery path out
        // of a lockout this server applied (see LoginAttempt).
        loginAttemptRepository.findById(user.getId()).ifPresent(attempt -> {
            attempt.setFailedAttempts(0);
            attempt.setAccountNonLocked(true);
            attempt.setLockedUntil(null);
            loginAttemptRepository.save(attempt);
        });

        // One-time use - close the reset window immediately after success
        verifiedEmails.remove(normalizedEmail);
        log.info("Password reset successfully for: {}", normalizedEmail);
    }

    // Private helpers

    private void validatePasswordStrength(String password) {
        if (password.length() < 6) {
            throw new ResetException("Password must be at least 6 characters.");
        }
        if (password.length() > 20) {
            throw new ResetException("Password must not exceed 20 characters.");
        }
        Set<String> banned = Set.of("123456", "12345678", "password", "qwerty", "111111", "000000", "abc123");
        if (banned.contains(password.toLowerCase())) {
            throw new ResetException("This password is too common. Please choose a stronger password.");
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String generateOtp() {
        // 4-digit: 1000-9999
        return String.valueOf(1000 + secureRandom.nextInt(9000));
    }
}
