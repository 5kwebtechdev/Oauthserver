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
 * receives the identifier, not the HttpServletRequest.
 *
 * This deployment talks to exactly one set of databases (superme_db / superme_db_admin - see
 * PrimaryDataSourceConfig / AdminDataSourceConfig), decided once by the env file, never per
 * request. What this filter still decides per request is not "which database" but:
 *   - ADMIN: the pending login is for the admin panel, so AppUserDetailsService must restrict
 *     itself to the Admin table only, never falling back to the shared SuperMeApp User table -
 *     without this, someone entering a regular end-user account's credentials on the admin login
 *     page authenticates successfully as that account, and only fails later, confusingly, on
 *     every admin API call. Both the prod-admin and dev-admin client ids map here: there is only
 *     one admin database to check in this deployment.
 *   - ANDROID_APP: the request is from the native Android client specifically, for the few
 *     behavioral differences that are about which client is asking rather than which database to
 *     read (e.g. GoogleLoginController requiring a full profile before auto-registering).
 *
 * ThreadLocal because Spring Security's authentication machinery (DaoAuthenticationProvider ->
 * UserDetailsService) runs on the same request thread with no request-scoped bean plumbed
 * through by default; always cleared in a finally block so a Tomcat worker thread reused for an
 * unrelated later request can never see a stale value.
 */
public class AdminLoginContextFilter extends OncePerRequestFilter {

    /** Distinguishes principals loaded from an Admin table from app Users with admin-like roles. */
    public static final String ADMIN_ACCOUNT_AUTHORITY = "AUTH_SERVER_ADMIN_ACCOUNT";

    public enum AdminClient { NONE, ADMIN, ANDROID_APP }

    private static final ThreadLocal<AdminClient> ADMIN_CLIENT = new ThreadLocal<>();

    public static boolean isAdminLoginPending() {
        return currentAdminClient() == AdminClient.ADMIN;
    }

    public static AdminClient currentAdminClient() {
        AdminClient value = ADMIN_CLIENT.get();
        return value == null ? AdminClient.NONE : value;
    }

    private final String adminClientId;
    private final String adminDevClientId;
    private final String apkDevClientId;
    private final String androidDevClientId;

    public AdminLoginContextFilter(String adminClientId, String adminDevClientId, String apkDevClientId) {
        this(adminClientId, adminDevClientId, apkDevClientId, "");
    }

    public AdminLoginContextFilter(String adminClientId, String adminDevClientId,
                                   String apkDevClientId, String androidDevClientId) {
        this.adminClientId = adminClientId;
        this.adminDevClientId = adminDevClientId;
        this.apkDevClientId = apkDevClientId;
        this.androidDevClientId = androidDevClientId;
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
        // Direct SPA Google and handoff login can precede /oauth2/authorize, so no saved request
        // exists yet. These endpoints accept explicit public client context to identify the client.
        if (("/api/auth/google-login".equals(request.getServletPath())
                || "/api/auth/handoff-login".equals(request.getServletPath()))
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
        if (!adminDevClientId.isBlank() && adminDevClientId.equals(id)) return AdminClient.ADMIN;
        if (!adminClientId.isBlank() && adminClientId.equals(id)) return AdminClient.ADMIN;
        if (!apkDevClientId.isBlank() && apkDevClientId.equals(id)) return AdminClient.ANDROID_APP;
        if (!androidDevClientId.isBlank() && androidDevClientId.equals(id)) return AdminClient.ANDROID_APP;
        return AdminClient.NONE;
    }
}
