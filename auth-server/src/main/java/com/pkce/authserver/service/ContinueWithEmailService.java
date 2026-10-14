package com.pkce.authserver.service;

import com.pkce.authserver.repository.SupermeUserRepository;
import com.pkce.authserver.superme.model.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Passwordless "continue with email" login, backed by a real one-time code emailed to the address
 * the caller typed in (see OtpService/EmailService) - receiving it is what proves they actually own
 * that email, which a hardcoded shared code never could.
 *
 * This used to double as self-registration. It can't any more: SuperMeBE's User table requires
 * name, gender, dateOfBirth and relationship, which this flow has no way to collect honestly, so an
 * email with no SuperMeApp account behind it is rejected rather than quietly provisioned. For an
 * existing account, a verified code is enough to log in - that account's own email was the thing
 * verified.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContinueWithEmailService {

    private static final String PURPOSE = "CONTINUE_WITH_EMAIL";

    private final SupermeUserRepository userRepository;
    private final OtpService otpService;
    private final EmailService emailService;

    public boolean accountExists(String email) {
        return findByEmail(email).isPresent();
    }

    public void issueOtp(String email) {
        String code = otpService.issue(PURPOSE, email);
        emailService.sendOtpEmail(email, code);
    }

    public static final class Result {
        public final User user;
        public final boolean newlyCreated;

        public Result(User user, boolean newlyCreated) {
            this.user = user;
            this.newlyCreated = newlyCreated;
        }
    }

    @Transactional
    public Result verifyAndLogin(String email, String otp) {
        if (!otpService.verify(PURPOSE, email, otp)) {
            throw new BadCredentialsException("Incorrect or expired code");
        }

        User user = findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException(
                        "No SuperMeApp account exists for " + email + " - register in the app first"));

        if (Boolean.TRUE.equals(user.getDeleted()) || !user.isEnabled()) {
            throw new BadCredentialsException("This account is not active");
        }

        log.info("Continue-with-email login for existing user '{}'", email);
        return new Result(user, false);
    }

    private Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }
}
