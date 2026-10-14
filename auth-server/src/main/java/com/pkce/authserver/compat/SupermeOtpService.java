package com.pkce.authserver.compat;

import com.pkce.authserver.config.SupermeProperties;
import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.service.EmailService;
import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.superme.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * SuperMeBE's registration OTP (com.superme.service.OtpServiceImpl), ported so the SuperMeApp
 * frontend's /api/auth/send-otp and /api/auth/verify-otp behave identically here: a 4-digit code,
 * five-minute expiry, held in memory, single-use, and a resend that resets the timer.
 *
 * This is a second OTP mechanism alongside com.pkce.authserver.service.OtpService, which is
 * database-backed, purpose-scoped and 6-digit, and serves this project's own flows
 * (continue-with-email, forgot-password, /api/auth/register). They are not merged because the two
 * contracts genuinely differ - their VerifyOtpRequest validates exactly four digits - and a client
 * written against the real API would break on a 6-digit code.
 *
 * One deliberate addition: a successful verification is remembered for
 * {@link #VERIFIED_TTL_MINUTES} minutes. Their /auth/register trusts the caller to have verified
 * first, because the same app served both and nothing else could reach it. This one is reachable
 * on its own, so the compat register checks that record instead of taking it on trust - invisible
 * to a client that follows the normal send -> verify -> register order.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SupermeOtpService {

    private static final int OTP_EXPIRY_MINUTES = SupermeEmailTemplates.OTP_EXPIRY_MINUTES;
    private static final int VERIFIED_TTL_MINUTES = 30;
    /**
     * Wrong guesses before the code is destroyed. Not in SuperMeBE's version, and not optional
     * here: their codes are 4 digits - 9000 possibilities - and this endpoint is reachable
     * directly, so uncapped guessing walks the whole space well inside the 2-minute window. Rate
     * limiting does not cover it either, being per IP.
     */
    private static final int MAX_ATTEMPTS = 5;

    private final EmailService emailService;
    private final SupermeUserRepository userRepository;
    private final SupermeProperties supermeProperties;
    private final SecurityEventService securityEventService;

    private record OtpData(String otp, Instant expiresAt, AtomicInteger attempts) {
        OtpData(String otp, Instant expiresAt) {
            this(otp, expiresAt, new AtomicInteger());
        }

        boolean isExpired() {
            return Instant.now().isAfter(expiresAt);
        }
    }

    private final Map<String, OtpData> otpStore = new ConcurrentHashMap<>();
    private final Map<String, Instant> verifiedEmails = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    /** Thrown for every caller-fixable rejection, mapped to 400 by the compat controllers. */
    public static class OtpException extends RuntimeException {
        public OtpException(String message) {
            super(message);
        }
    }

    @Transactional
    public void sendOtp(String email) {
        String normalizedEmail = normalizeEmail(email);

        Optional<User> existing = userRepository.findByEmail(normalizedEmail);
        if (existing.isPresent()) {
            User user = existing.get();
            if (!Boolean.TRUE.equals(user.getDeleted())) {
                log.warn("Send-OTP blocked, account already exists for: {}", normalizedEmail);
                throw new OtpException("Account already exists with this email.");
            }
            // Previously deleted account still holding this email - wipe its identity fields so the
            // address is free to be registered again, exactly as theirs does.
            if (!supermeProperties.isWritesEnabled()) {
                throw new OtpException("Account already exists with this email.");
            }
            log.info("Reclaiming email from deleted account (userId={}) for re-registration: {}",
                    user.getId(), normalizedEmail);
            user.setEmail(null);
            user.setPhone(null);
            user.setEmailVerificationToken(null);
            user.setOauth2ProviderId(null);
            user.setName("Deleted User");
            userRepository.save(user);
        }

        String otp = generateOtp();
        otpStore.put(normalizedEmail, new OtpData(otp, Instant.now().plusSeconds(OTP_EXPIRY_MINUTES * 60L)));
        // Their branded HTML template, not this project's plain-text one - a SuperMeApp user gets
        // the same email here as from the real backend. See SupermeEmailTemplates.
        emailService.sendHtmlMail(normalizedEmail, SupermeEmailTemplates.OTP_SUBJECT,
                SupermeEmailTemplates.otpVerification(otp));
        log.info("OTP email dispatched to: {}", normalizedEmail);
    }

    public void verifyOtp(String email, String otp) {
        String normalizedEmail = normalizeEmail(email);
        String normalizedOtp = otp == null ? null : otp.trim();

        OtpData otpData = otpStore.get(normalizedEmail);
        if (otpData == null) {
            throw new OtpException("No OTP found for this email. Please request a new OTP.");
        }
        if (otpData.isExpired()) {
            otpStore.remove(normalizedEmail);
            throw new OtpException("OTP has expired. Please request a new OTP.");
        }
        if (normalizedOtp == null || !otpData.otp().equals(normalizedOtp)) {
            if (otpData.attempts().incrementAndGet() >= MAX_ATTEMPTS) {
                otpStore.remove(normalizedEmail);
                log.warn("OTP guess cap reached for {} - code destroyed", normalizedEmail);
                securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, normalizedEmail, null,
                        "registration: guess cap reached, code destroyed");
                throw new OtpException("Too many incorrect attempts. Please request a new OTP.");
            }
            securityEventService.record(SecurityEventType.OTP_VERIFY_FAILURE, normalizedEmail, null,
                    "registration: incorrect code");
            throw new OtpException("Invalid OTP. Please check and try again.");
        }

        // Valid - remove immediately so it cannot be reused, and remember that this address was
        // proven, so the register call that follows does not have to be taken on trust.
        otpStore.remove(normalizedEmail);
        verifiedEmails.put(normalizedEmail, Instant.now().plusSeconds(VERIFIED_TTL_MINUTES * 60L));
        log.info("OTP verified successfully for: {}", normalizedEmail);
    }

    /** True when this address completed verifyOtp recently; consumed so it cannot be replayed. */
    public boolean consumeVerification(String email) {
        String normalizedEmail = normalizeEmail(email);
        Instant verifiedUntil = verifiedEmails.remove(normalizedEmail);
        return verifiedUntil != null && Instant.now().isBefore(verifiedUntil);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String generateOtp() {
        // SecureRandom guarantees cryptographically strong random values; 4-digit range 1000-9999
        return String.valueOf(1000 + secureRandom.nextInt(9000));
    }
}
