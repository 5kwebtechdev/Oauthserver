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
    private static final String AUTHORIZE_PATH = "/oauth2/authorize";
    public static final String LOGOUT_MARKER_COOKIE = "SUPERME_APP_LOGOUT";

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
        String clientId = normalize(request.getParameter("client_id"));
        boolean appLogout = LOGOUT_PATH.equals(request.getServletPath()) && appClientIds.contains(clientId);
        boolean newAppAuthorization = AUTHORIZE_PATH.equals(request.getServletPath())
                && "GET".equalsIgnoreCase(request.getMethod()) && appClientIds.contains(clientId);
        return !appLogout && !newAppAuthorization;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (AUTHORIZE_PATH.equals(request.getServletPath())) {
            // A fresh, explicit Login action begins a new flow and should supersede the
            // cross-tab logout marker left by the previous session.
            response.addHeader("Set-Cookie", LOGOUT_MARKER_COOKIE
                    + "=; Max-Age=0; Path=/; Secure; SameSite=Lax");
            filterChain.doFilter(request, response);
            return;
        }

        HttpServletResponseWrapper landingResponse = new HttpServletResponseWrapper(response) {
            @Override
            public void sendRedirect(String location) throws IOException {
                addHeader("Set-Cookie", LOGOUT_MARKER_COOKIE
                        + "=1; Max-Age=120; Path=/; Secure; SameSite=Lax");
                super.sendRedirect(landingUrl);
            }
        };
        filterChain.doFilter(request, landingResponse);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
