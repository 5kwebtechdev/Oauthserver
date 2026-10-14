package com.pkce.authserver.service;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.LoginAttemptRepository;
import com.pkce.authserver.repository.UserPasswordRepository;
import com.pkce.authserver.superme.model.User;
import com.pkce.authserver.superme.model.UserPassword;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

/**
 * Real password-reset codes, emailed to the account's address on file. Accounts with no email can't
 * be self-service reset this way - requestReset() silently no-ops for them rather than erroring, so
 * the response to the caller stays identical either way (same anti-enumeration reasoning
 * ForgotPasswordController already documents).
 *
 * The reset writes SuperMeBE's UserPassword row, which is live production credential data shared
 * with a running application, so it is refused unless app.superme.writes-enabled is on. The
 * identifier may be an email or a phone number, matching how login works here.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ForgotPasswordService {

    private static final String PURPOSE = "FORGOT_PASSWORD";

    private final SupermeUserLookup userLookup;
    private final UserPasswordRepository userPasswordRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final SupermeProperties supermeProperties;
    private final PasswordEncoder passwordEncoder;
    private final OtpService otpService;
    private final EmailService emailService;

    public void requestReset(String identifier) {
        User user = userLookup.findByIdentifier(identifier).orElse(null);
        if (user == null || !StringUtils.hasText(user.getEmail())) {
            log.info("Forgot-password requested for '{}' - no account or no email on file, not sending anything", identifier);
            return;
        }
        String code = otpService.issue(PURPOSE, user.getEmail());
        emailService.sendOtpEmail(user.getEmail(), code);
    }

    @Transactional
    public void resetPassword(String identifier, String otp, String newPassword) {
        User user = userLookup.findByIdentifier(identifier).orElse(null);
        if (user == null || !StringUtils.hasText(user.getEmail()) || !otpService.verify(PURPOSE, user.getEmail(), otp)) {
            throw new BadCredentialsException("Incorrect or expired code.");
        }

        if (!supermeProperties.isWritesEnabled()) {
            log.warn("Password reset for '{}' verified but refused: app.superme.writes-enabled is false", identifier);
            throw new IllegalStateException("Password reset is disabled on this server");
        }

        UserPassword userPassword = userPasswordRepository.findByUser(user)
                .orElseGet(() -> UserPassword.builder().user(user).build());
        userPassword.setPassword(passwordEncoder.encode(newPassword));
        userPasswordRepository.save(userPassword);

        // A verified-by-email reset is at least as strong a proof of ownership as a correct
        // password - clear any lockout from unrelated failed-password attempts so this is also
        // this account's self-service recovery path, not just a password change.
        loginAttemptRepository.findById(user.getId()).ifPresent(attempt -> {
            attempt.setFailedAttempts(0);
            attempt.setAccountNonLocked(true);
            attempt.setLockedUntil(null);
            loginAttemptRepository.save(attempt);
        });
    }
}
