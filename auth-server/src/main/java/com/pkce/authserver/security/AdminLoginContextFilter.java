package com.pkce.authserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Carries "which admin client (if any) is the pending OAuth authorization for" from the saved
 * authorization request through to AppUserDetailsService, which has no other way to know which
 * client a /login POST is authenticating for - UserDetailsService.loadUserByUsername only
 * receives the identifier, not the HttpServletRequest.
 *
 * Two things this enables, both in AppUserDetailsService:
 *   - Admin-panel logins (either variant) are restricted to the Admin table only, never falling
 *     back to the shared SuperMeApp User table - without this, someone entering a regular
 *     end-user account's credentials on the admin login page authenticates successfully as that
 *     account, and only fails later, confusingly, on every admin API call.
 *   - devadmin.supermeapp.com logins check the DEV admin database (AdminDevRepository), not the
 *     prod one - this one process serves both admin.supermeapp.com and devadmin.supermeapp.com,
 *     which are two genuinely different physical databases, not just different client ids.
 *
 * ThreadLocal because Spring Security's authentication machinery (DaoAuthenticationProvider ->
 * UserDetailsService) runs on the same request thread with no request-scoped bean plumbed
 * through by default; always cleared in a finally block so a Tomcat worker thread reused for an
 * unrelated later request can never see a stale value.
 */
public class AdminLoginContextFilter extends OncePerRequestFilter {

    public enum AdminClient { NONE, PROD, DEV }

    private static final ThreadLocal<AdminClient> ADMIN_CLIENT = new ThreadLocal<>();

    /** Kept for callers that only care whether this is an admin login at all, of either variant. */
    public static boolean isAdminLoginPending() {
        return currentAdminClient() != AdminClient.NONE;
    }

    public static AdminClient currentAdminClient() {
        AdminClient value = ADMIN_CLIENT.get();
        return value == null ? AdminClient.NONE : value;
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
            ADMIN_CLIENT.set(computeAdminClient(request));
            filterChain.doFilter(request, response);
        } finally {
            ADMIN_CLIENT.remove();
        }
    }

    private AdminClient computeAdminClient(HttpServletRequest request) {
        var session = request.getSession(false);
        var saved = session == null ? null : session.getAttribute("SPRING_SECURITY_SAVED_REQUEST");
        if (saved instanceof SavedRequest savedRequest) {
            String[] ids = savedRequest.getParameterValues("client_id");
            if (ids != null && ids.length == 1) {
                if (!adminDevClientId.isBlank() && adminDevClientId.equals(ids[0])) {
                    return AdminClient.DEV;
                }
                if (!adminClientId.isBlank() && adminClientId.equals(ids[0])) {
                    return AdminClient.PROD;
                }
            }
        }
        return AdminClient.NONE;
    }
}
