package com.pkce.authserver.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.web.savedrequest.SavedRequest;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Carries "which non-default client (if any) is the pending OAuth authorization for" from the
 * saved authorization request through to AppUserDetailsService, which has no other way to know
 * which client a /login POST is authenticating for - UserDetailsService.loadUserByUsername only
 * receives the identifier, not the HttpServletRequest. Named for its original purpose (admin
 * routing); APK_DEV was added later for the same underlying need, not worth a rename.
 *
 * What this enables, all in AppUserDetailsService:
 *   - Admin-panel logins (either variant) are restricted to the Admin table only, never falling
 *     back to the shared SuperMeApp User table - without this, someone entering a regular
 *     end-user account's credentials on the admin login page authenticates successfully as that
 *     account, and only fails later, confusingly, on every admin API call.
 *   - devadmin.supermeapp.com logins check the DEV admin database (AdminDevRepository), not prod.
 *   - APK_DEV (e.g. devapk.supermeapp.com) logins check the DEV primary database
 *     (UserDevRepository/superme_db) instead of prod's mindfullP1 - same reasoning as admin-dev:
 *     this one process serves both prod and dev clients, which read genuinely different physical
 *     databases, not just different client ids against the same data.
 *
 * ThreadLocal because Spring Security's authentication machinery (DaoAuthenticationProvider ->
 * UserDetailsService) runs on the same request thread with no request-scoped bean plumbed
 * through by default; always cleared in a finally block so a Tomcat worker thread reused for an
 * unrelated later request can never see a stale value.
 */
public class AdminLoginContextFilter extends OncePerRequestFilter {

    public enum AdminClient { NONE, PROD, DEV, APK_DEV }

    private static final ThreadLocal<AdminClient> ADMIN_CLIENT = new ThreadLocal<>();

    /** Kept for callers that only care whether this is an admin login at all, of either variant. */
    public static boolean isAdminLoginPending() {
        AdminClient value = currentAdminClient();
        return value == AdminClient.PROD || value == AdminClient.DEV;
    }

    public static AdminClient currentAdminClient() {
        AdminClient value = ADMIN_CLIENT.get();
        return value == null ? AdminClient.NONE : value;
    }

    private final String adminClientId;
    private final String adminDevClientId;
    private final String apkDevClientId;

    public AdminLoginContextFilter(String adminClientId, String adminDevClientId, String apkDevClientId) {
        this.adminClientId = adminClientId;
        this.adminDevClientId = adminDevClientId;
        this.apkDevClientId = apkDevClientId;
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
        // Direct SPA Google login can precede /oauth2/authorize, so no saved
        // request exists yet. Only this endpoint accepts explicit client context.
        if ("/api/auth/google-login".equals(request.getServletPath())
                && request.getParameter("client_id") != null) {
            return clientForId(request.getParameter("client_id"));
        }
        var session = request.getSession(false);
        var saved = session == null ? null : session.getAttribute("SPRING_SECURITY_SAVED_REQUEST");
        if (saved instanceof SavedRequest savedRequest) {
            String[] ids = savedRequest.getParameterValues("client_id");
            if (ids != null && ids.length == 1) {
                return clientForId(ids[0]);
            }
        }
        return AdminClient.NONE;
    }

    private AdminClient clientForId(String id) {
        if (!adminDevClientId.isBlank() && adminDevClientId.equals(id)) return AdminClient.DEV;
        if (!adminClientId.isBlank() && adminClientId.equals(id)) return AdminClient.PROD;
        if (!apkDevClientId.isBlank() && apkDevClientId.equals(id)) return AdminClient.APK_DEV;
        return AdminClient.NONE;
    }
}
