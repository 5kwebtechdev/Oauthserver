package com.pkce.authserver.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.savedrequest.HttpSessionRequestCache;
import org.springframework.security.web.savedrequest.RequestCache;

import java.io.IOException;

/**
 * Sends an unauthenticated /oauth2/authorize request straight to its client's branded login
 * page, instead of the plain LoginUrlAuthenticationEntryPoint("/login") always used first and
 * then immediately 302ed again by LoginPageController once it reads the saved request's
 * client_id. Same information (the request's own client_id param), used one hop earlier -
 * LoginPageController's redirect-from-/login logic is untouched and still runs for every other
 * path that reaches /login directly (e.g. a bookmarked link, or no pending authorization at
 * all), so this only removes the extra round trip for the common case of clicking Login from
 * a client's own frontend.
 */
public final class ClientAwareLoginEntryPoint implements AuthenticationEntryPoint {

    private final String apkDevClientId;
    private final String adminClientId;
    private final String adminDevClientId;
    private final RequestCache requestCache = new HttpSessionRequestCache();

    public ClientAwareLoginEntryPoint(String apkDevClientId, String adminClientId, String adminDevClientId) {
        this.apkDevClientId = normalize(apkDevClientId);
        this.adminClientId = normalize(adminClientId);
        this.adminDevClientId = normalize(adminDevClientId);
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                          AuthenticationException authException) throws IOException, ServletException {
        String clientId = request.getParameter("client_id");
        String loginPath = "/login";
        if (!apkDevClientId.isBlank() && apkDevClientId.equals(clientId)) {
            loginPath = "/apklogin";
        } else if ((!adminClientId.isBlank() && adminClientId.equals(clientId))
                || (!adminDevClientId.isBlank() && adminDevClientId.equals(clientId))) {
            loginPath = "/adminlogin";
        }
        requestCache.saveRequest(request, response);
        response.sendRedirect(response.encodeRedirectURL(request.getContextPath() + loginPath));
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
