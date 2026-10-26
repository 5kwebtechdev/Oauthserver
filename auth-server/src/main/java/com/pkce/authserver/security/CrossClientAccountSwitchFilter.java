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
 * reuse an admin principal for the APK client or an app-user principal for the admin dev client.
 * Preserve the pending authorization request and ask for credentials on the target client's
 * branded login page, where the existing client context selects the matching account store.
 */
public final class CrossClientAccountSwitchFilter extends OncePerRequestFilter {

    private static final Set<String> ADMIN_ROLES = Set.of(
            "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_EXECUTIVE");

    private final String apkDevClientId;
    private final String adminDevClientId;
    private final RequestCache requestCache = new HttpSessionRequestCache();

    public CrossClientAccountSwitchFilter(String apkDevClientId, String adminDevClientId) {
        this.apkDevClientId = normalize(apkDevClientId);
        this.adminDevClientId = normalize(adminDevClientId);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isAuthorizationRequest(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientId = request.getParameter("client_id");
        if (clientId.equals(apkDevClientId) && hasAdminSession()) {
            switchAccount(request, response, "/apklogin?account_switch=admin");
            return;
        }
        if (clientId.equals(adminDevClientId) && hasAuthenticatedNonAdminSession()) {
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
                && ((!apkDevClientId.isBlank() && apkDevClientId.equals(clientId))
                || (!adminDevClientId.isBlank() && adminDevClientId.equals(clientId)));
    }

    private void switchAccount(HttpServletRequest request, HttpServletResponse response, String loginPath)
            throws IOException {
        // LoginPageController and AdminLoginContextFilter use this saved request to select the
        // correct branded form and account database. The success handler returns to this request.
        requestCache.saveRequest(request, response);
        response.sendRedirect(response.encodeRedirectURL(request.getContextPath() + loginPath));
    }

    private boolean hasAdminSession() {
        return hasAuthenticatedSession() && hasAnyRole(ADMIN_ROLES);
    }

    private boolean hasAuthenticatedNonAdminSession() {
        return hasAuthenticatedSession() && !hasAnyRole(ADMIN_ROLES);
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
