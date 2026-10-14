package com.pkce.authserver.security;

import com.pkce.authserver.service.LoginAttemptService;
import com.pkce.authserver.service.SupermeUserLookup;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.event.AuthenticationFailureBadCredentialsEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


/**
 * Only ever sees form-login (password) authentication - Google/continue-with-email never
 * go through an AuthenticationManager (SessionLoginHelper sets the SecurityContext
 * directly), so neither event fires for them, which is correct: account lockout is a
 * password brute-force defense and those flows have no password to brute-force.
 *
 * The bookkeeping itself lives in LoginAttemptService, shared with the SuperMeBE-compatible login
 * (/v1/auth/login), which checks the password itself and so publishes none of these events.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class LoginAttemptListener {

    private final SupermeUserLookup userLookup;
    private final LoginAttemptService loginAttemptService;

    @EventListener
    @Transactional
    public void onFailure(AuthenticationFailureBadCredentialsEvent event) {
        String identifier = event.getAuthentication().getName();
        String ip = remoteAddress(event.getAuthentication());
        userLookup.findByIdentifier(identifier)
                .ifPresent(user -> loginAttemptService.recordFailure(user.getId(), identifier, ip));
    }

    @EventListener
    @Transactional
    public void onSuccess(AuthenticationSuccessEvent event) {
        if (!(event.getAuthentication() instanceof UsernamePasswordAuthenticationToken)) {
            return;
        }
        userLookup.findByIdentifier(event.getAuthentication().getName())
                .ifPresent(user -> loginAttemptService.recordSuccess(user.getId()));
    }

    private String remoteAddress(Authentication authentication) {
        if (authentication.getDetails() instanceof WebAuthenticationDetails details) {
            return details.getRemoteAddress();
        }
        return null;
    }
}
