package com.pkce.authserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Carries "is the pending OAuth authorization for the admin client" from the saved
 * authorization request through to AppUserDetailsService, which has no other way to know
 * which client a /login POST is authenticating for - UserDetailsService.loadUserByUsername
 * only receives the identifier, not the HttpServletRequest.
 *
 * Needed so admin-panel logins can be restricted to mindfullAdmin.Admin only, never falling
 * back to mindfullP1.User: without this, someone entering a regular SuperMeApp account's
 * credentials on the admin login page authenticates successfully as that account (a real,
 * working login - just not an admin one), and only fails later, confusingly, on every
 * subsequent admin API call with "Invalid admin token". This closes that off at login time
 * with the same generic "Invalid email or password" failure a wrong password gives, rather
 * than letting a non-admin credential succeed into the admin client's session at all.
 *
 * ThreadLocal because Spring Security's authentication machinery (DaoAuthenticationProvider
 * -> UserDetailsService) runs on the same request thread with no request-scoped bean
 * plumbed through by default; always cleared in a finally block so a Tomcat worker thread
 * reused for an unrelated later request can never see a stale value.
 */
public class AdminLoginContextFilter extends OncePerRequestFilter {

    private static final ThreadLocal<Boolean> ADMIN_LOGIN_PENDING = new ThreadLocal<>();

    public static boolean isAdminLoginPending() {
        return Boolean.TRUE.equals(ADMIN_LOGIN_PENDING.get());
    }

    private final String adminClientId;
    private final String adminDevClientId;

    public AdminLoginContextFilter(String adminClientId, String adminDevClientId) {
        this.adminClientId = adminClientId;
        this.adminDevClientId = adminDevClientId;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            ADMIN_LOGIN_PENDING.set(computeIsAdminLoginPending(request));
            filterChain.doFilter(request, response);
        } finally {
            ADMIN_LOGIN_PENDING.remove();
        }
    }

    private boolean computeIsAdminLoginPending(HttpServletRequest request) {
        var session = request.getSession(false);
        var saved = session == null ? null : session.getAttribute("SPRING_SECURITY_SAVED_REQUEST");
        if (saved instanceof SavedRequest savedRequest) {
            String[] ids = savedRequest.getParameterValues("client_id");
            if (ids != null && ids.length == 1) {
                return (!adminClientId.isBlank() && adminClientId.equals(ids[0]))
                        || (!adminDevClientId.isBlank() && adminDevClientId.equals(ids[0]));
            }
        }
        return false;
    }
}
