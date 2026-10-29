package com.pkce.authserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * The auth server has one browser SSO session, shared by all its OAuth clients. Do not silently
 * reuse an admin principal for an app client or an app-user principal for an admin client.
 * Preserve the pending authorization request and ask for credentials on the target client's
 * branded login page, where the existing client context selects the matching account store.
 */
public final class CrossClientAccountSwitchFilter extends OncePerRequestFilter {

    private final Set<String> appClientIds;
    private final Set<String> adminClientIds;
    private final String apkDevClientId;
    private final RequestCache requestCache = new HttpSessionRequestCache();

    public CrossClientAccountSwitchFilter(String apkDevClientId, String adminDevClientId) {
        this("", "", apkDevClientId, "", adminDevClientId);
    }

    public CrossClientAccountSwitchFilter(String appClientId, String additionalAppClientId,
                                          String apkDevClientId, String adminClientId,
                                          String adminDevClientId) {
        this.appClientIds = java.util.stream.Stream.of(appClientId, additionalAppClientId, apkDevClientId)
                .map(CrossClientAccountSwitchFilter::normalize).filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        this.adminClientIds = java.util.stream.Stream.of(adminClientId, adminDevClientId)
                .map(CrossClientAccountSwitchFilter::normalize).filter(value -> !value.isBlank())
                .collect(java.util.stream.Collectors.toUnmodifiableSet());
        this.apkDevClientId = normalize(apkDevClientId);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isAuthorizationRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = request.getParameter("client_id");
        if (appClientIds.contains(clientId) && hasAdminSession()) {
            String loginPath = clientId.equals(apkDevClientId) ? "/apklogin" : "/login";
            switchAccount(request, response, loginPath + "?account_switch=admin");
            return;
        }
        if (adminClientIds.contains(clientId) && hasAuthenticatedNonAdminSession()) {
            switchAccount(request, response, "/adminlogin?account_switch=app");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAuthorizationRequest(HttpServletRequest request) {
        String clientId = request.getParameter("client_id");
        return "GET".equalsIgnoreCase(request.getMethod())
                && "/oauth2/authorize".equals(request.getServletPath())
                && clientId != null
                && (appClientIds.contains(clientId) || adminClientIds.contains(clientId));
    }

    private void switchAccount(HttpServletRequest request, HttpServletResponse response, String loginPath)
            throws IOException {
        // LoginPageController and AdminLoginContextFilter use this saved request to select the
        // correct branded form and account database. The success handler returns to this request.
        requestCache.saveRequest(request, response);
        response.sendRedirect(response.encodeRedirectURL(request.getContextPath() + loginPath));
    }

    private boolean hasAdminSession() {
        return hasAuthenticatedSession()
                && hasAnyRole(Set.of(AdminLoginContextFilter.ADMIN_ACCOUNT_AUTHORITY));
    }

    private boolean hasAuthenticatedNonAdminSession() {
        return hasAuthenticatedSession()
                && !hasAnyRole(Set.of(AdminLoginContextFilter.ADMIN_ACCOUNT_AUTHORITY));
    }

    private boolean hasAuthenticatedSession() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
    }

    private boolean hasAnyRole(Set<String> roles) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(roles::contains);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
