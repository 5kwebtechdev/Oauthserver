package com.pkce.authserver.service;

import com.pkce.authserver.entity.OtpCode;
import com.pkce.authserver.repository.OtpCodeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HexFormat;

/**
 * Real one-time codes: random, hashed at rest, expiring, single-use, and capped on
 * verify attempts - replaces the old hardcoded "123123" shared by forgot-password and
 * continue-with-email, which let anyone claim any email with no proof of ownership.
 * Actually receiving the code (via EmailService) is what now proves that ownership.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    /**
     * How long an emailed code stays valid, for every flow in this app - this service's own
     * (continue-with-email, forgot-password, /api/auth/register) and the SuperMeBE-compatible ones
     * (see SupermeEmailTemplates, which prints it in the email body). Kept in one place on purpose:
     * the value is quoted to the user in the mail, so a second copy that drifted would make the
     * email lie about when the code dies.
     */
    public static final int EXPIRY_MINUTES = 2;

    private static final Duration TTL = Duration.ofMinutes(EXPIRY_MINUTES);
    private static final int MAX_ATTEMPTS = 5;

    private final OtpCodeRepository otpCodeRepository;
    private final SecurityEventService securityEventService;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Generates and persists a new code for (purpose, email), invalidating any prior unused one. Returns the plaintext code to send. */
    @Transactional
    public String issue(String purpose, String email) {
        otpCodeRepository.deleteUnconsumed(purpose, email);

        String code = String.format("%06d", secureRandom.nextInt(1_000_000));

        OtpCode entity = new OtpCode();
        entity.setPurpose(purpose);
        entity.setEmail(email);
        entity.setCodeHash(sha256(code));
        entity.setExpiresAt(LocalDateTime.now().plus(TTL));
        otpCodeRepository.save(entity);

        return code;
    }

    /**
     * Verifies and, on success, consumes the latest outstanding code for (purpose, email).
     *
     * REQUIRES_NEW, deliberately: both callers (ContinueWithEmailService.verifyAndLogin,
     * ForgotPasswordService.resetPassword) are themselves @Transactional and throw a
     * BadCredentialsException right after a failed verify() returns - with the default
     * REQUIRED propagation, that join-the-caller's-transaction behavior meant the
     * exception's rollback silently discarded this method's own writes too (the attempt
     * counter increment AND the OTP_VERIFY_FAILURE security event), defeating the
     * max-attempts brute-force cap entirely since the counter could never advance past its
     * last-committed value. REQUIRES_NEW commits this method's writes in their own
     * transaction immediately, independent of whatever the caller does afterward.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean verify(String purpose, String email, String code) {
        OtpCode entity = otpCodeRepository
                .findFirstByPurposeAndEmailAndConsumedFalseOrderByCreatedAtDesc(purpose, email)
                .orElse(null);

        if (entity == null) {
            // No code was ever issued for this email - either a typo, or a bot guessing
            // at random emails (exactly the abuse the "verify" rate-limit category exists
            // for, since nothing else here would otherwise even notice this).
            securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, email, null, purpose + ": no outstanding code");
            return false;
        }
        if (entity.getExpiresAt().isBefore(LocalDateTime.now()) || entity.getAttempts() >= MAX_ATTEMPTS) {
            securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, email, null, purpose + ": code expired or attempts exhausted");
            return false;
        }

        if (!entity.getCodeHash().equals(sha256(code))) {
            entity.setAttempts(entity.getAttempts() + 1);
            otpCodeRepository.save(entity);
            securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, email, null,
                    purpose + ": wrong code (attempt " + entity.getAttempts() + "/" + MAX_ATTEMPTS + ")");
            return false;
        }

        entity.setConsumed(true);
        otpCodeRepository.save(entity);
        return true;
    }

    private static String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes()));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
