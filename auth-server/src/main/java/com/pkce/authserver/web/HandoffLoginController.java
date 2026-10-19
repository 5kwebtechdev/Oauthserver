package com.pkce.authserver.web;

import com.pkce.authserver.service.AppUserDetailsService;
import com.pkce.authserver.service.HandoffTicketRedeemer;
import com.pkce.authserver.service.SessionLoginHelper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Signs in the browser a user just arrived in, using the one-time pass their app put in the URL.
 *
 * Why this exists: the app and the phone's browser share no cookies or storage, so a user who
 * taps through to the website would otherwise land there as a stranger. This establishes the
 * ordinary session they would have got by signing in, after which the normal authorization-code
 * flow completes silently - the pass itself is finished and cannot be used again.
 *
 * Deliberately the same shape as GoogleLoginController: redeem a proof, build the UserDetails,
 * hand off to SessionLoginHelper, and let the caller follow redirectTo.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class HandoffLoginController {

    private final HandoffTicketRedeemer redeemer;
    private final AppUserDetailsService appUserDetailsService;
    private final SessionLoginHelper sessionLoginHelper;

    public record HandoffLoginRequest(@NotBlank String ticket) { }

    @PostMapping("/handoff-login")
    public ResponseEntity<Map<String, Object>> handoffLogin(@Valid @RequestBody HandoffLoginRequest request,
                                                            HttpServletRequest httpRequest,
                                                            HttpServletResponse httpResponse) {
        String subject;
        try {
            subject = redeemer.redeem(request.ticket());
        } catch (HandoffTicketRedeemer.TicketNotRedeemableException e) {
            // One response for expired, spent and unknown alike - nothing to learn by guessing.
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "handoff_ticket_invalid",
                    "message", e.getMessage()));
        }

        UserDetails userDetails;
        try {
            // loadUserByUsername, not loadVerifiedUser: the pass proves the user was signed in,
            // and this re-checks the account is still usable (disabled, deleted, locked) at the
            // moment it is redeemed rather than when it was issued.
            userDetails = appUserDetailsService.loadUserByUsername(subject);
        } catch (UsernameNotFoundException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                    "error", "handoff_account_unavailable",
                    "message", "This account can no longer be signed in to."));
        }

        String redirectTo = sessionLoginHelper.establishSessionAndResolveRedirect(
                userDetails, httpRequest, httpResponse);

        Map<String, Object> body = new HashMap<>();
        body.put("username", userDetails.getUsername());
        body.put("redirectTo", redirectTo);
        return ResponseEntity.ok(body);
    }
}
