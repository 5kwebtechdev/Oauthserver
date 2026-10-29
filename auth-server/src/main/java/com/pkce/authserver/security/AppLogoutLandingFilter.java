package com.pkce.authserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * Keeps the existing OIDC logout endpoint and session invalidation flow, while making logout
 * initiated by the production app clients finish at the public landing page. This also covers a
 * tab that logs itself out after another tab invalidates the shared auth-server session: its
 * logout request can no longer send it back to the auth-server login page.
 */
public final class AppLogoutLandingFilter extends OncePerRequestFilter {

    private static final String LOGOUT_PATH = "/connect/logout";

    private final Set<String> appClientIds;
    private final String landingUrl;

    public AppLogoutLandingFilter(String appClientId, String additionalAppClientId, String landingUrl) {
        this.appClientIds = java.util.stream.Stream.of(appClientId, additionalAppClientId)
                .map(AppLogoutLandingFilter::normalize)
                .filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        this.landingUrl = landingUrl;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !LOGOUT_PATH.equals(request.getServletPath())
                || !appClientIds.contains(normalize(request.getParameter("client_id")));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        HttpServletResponseWrapper landingResponse = new HttpServletResponseWrapper(response) {
            @Override
            public void sendRedirect(String location) throws IOException {
                super.sendRedirect(landingUrl);
            }
        };
        filterChain.doFilter(request, landingResponse);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
