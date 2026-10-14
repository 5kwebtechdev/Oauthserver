package com.pkce.authserver.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.stereotype.Component;

/**
 * Shared by every non-password login path (Google, continue-with-email) that needs to
 * establish this backend's own session for an already-verified user and then resume
 * whatever /oauth2/authorize request originally brought the browser to the login page -
 * exactly what Spring's default form-login success handler does for username/password,
 * reimplemented here since these paths don't go through that filter.
 */
@Component
public class SessionLoginHelper {

    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final RequestCache requestCache = new HttpSessionRequestCache();

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    public String establishSessionAndResolveRedirect(UserDetails userDetails,
                                                       HttpServletRequest request,
                                                       HttpServletResponse response) {
        UsernamePasswordAuthenticationToken authentication =
                UsernamePasswordAuthenticationToken.authenticated(userDetails, null, userDetails.getAuthorities());

        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);

        SavedRequest savedRequest = requestCache.getRequest(request, response);
        return savedRequest != null ? savedRequest.getRedirectUrl() : frontendBaseUrl;
    }

    /** For an already-authenticated request (e.g. completing a profile mid-flow) - no re-authentication, just the redirect target. */
    public String resolveRedirect(HttpServletRequest request, HttpServletResponse response) {
        SavedRequest savedRequest = requestCache.getRequest(request, response);
        return savedRequest != null ? savedRequest.getRedirectUrl() : frontendBaseUrl;
    }
}
