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
 * An auth-server SSO session belongs to one principal, regardless of which frontend opens a new
 * tab. Do not silently reuse an administrative principal for the dev APK client: preserve the
 * pending authorization request and ask for SuperMeApp credentials against the APK account store.
 */
public final class AdminToAppClientAccountSwitchFilter extends OncePerRequestFilter {

    private static final Set<String> ADMIN_ROLES = Set.of(
            "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_MANAGER", "ROLE_EXECUTIVE");

    private final String apkDevClientId;
    private final RequestCache requestCache = new HttpSessionRequestCache();

    public AdminToAppClientAccountSwitchFilter(String apkDevClientId) {
        this.apkDevClientId = apkDevClientId == null ? "" : apkDevClientId.trim();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!isApkAuthorizationRequest(request) || !hasAdminSession()) {
            filterChain.doFilter(request, response);
            return;
        }

        // LoginPageController uses this saved client_id to render the APK-specific form. The
        // default SavedRequestAwareAuthenticationSuccessHandler returns to /oauth2/authorize
        // after successful app credentials, where authorization can safely continue as ROLE_USER.
        requestCache.saveRequest(request, response);
        response.sendRedirect(response.encodeRedirectURL(
                request.getContextPath() + "/apklogin?account_switch=admin"));
    }

    private boolean isApkAuthorizationRequest(HttpServletRequest request) {
        return !apkDevClientId.isBlank()
                && "GET".equalsIgnoreCase(request.getMethod())
                && "/oauth2/authorize".equals(request.getServletPath())
                && apkDevClientId.equals(request.getParameter("client_id"));
    }

    private boolean hasAdminSession() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(ADMIN_ROLES::contains);
    }
}
