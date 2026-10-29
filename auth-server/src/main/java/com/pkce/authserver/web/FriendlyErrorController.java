package com.pkce.authserver.web;

import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.net.URI;
import java.util.Map;

/**
 * Sends browser errors back to the auth-server sign-in page instead of showing the
 * Spring Boot Whitelabel page. JSON clients receive a small, safe error response.
 */
@Controller
public class FriendlyErrorController implements ErrorController {

    private static final String MESSAGE = "Something went wrong. Please try again.";
    private static final URI LOGIN_URI = URI.create("https://authprod.supermeapp.com/login");

    @RequestMapping("${server.error.path:${error.path:/error}}")
    @ResponseBody
    public ResponseEntity<?> error(HttpServletRequest request) {
        HttpStatus status = resolveStatus(request);
        String accept = request.getHeader("Accept");
        boolean jsonRequested = accept != null && accept.contains(MediaType.APPLICATION_JSON_VALUE)
                && !accept.contains(MediaType.TEXT_HTML_VALUE);
        if (jsonRequested) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .body(Map.of("status", status.value(), "error", status.getReasonPhrase(), "message", MESSAGE));
        }

        Object originalUri = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);

        // A rejected login POST (for example, an expired CSRF token) should get a fresh
        // login page. A failure while serving the GET /login itself must not loop.
        if (isLoginPage(originalUri) && "POST".equalsIgnoreCase(request.getMethod())) {
            return redirectToLogin();
        }

        // OAuth/API errors must retain their protocol status instead of being converted
        // into a sign-in redirect (for example, invalid redirect_uri and logout hints).
        // Also avoid a redirect loop if the sign-in page itself is unavailable.
        if (isLoginPage(originalUri) || isProtocolEndpoint(originalUri)) {
            return ResponseEntity.status(status)
                    .contentType(MediaType.TEXT_HTML)
                    .header("Cache-Control", "no-store, no-cache, must-revalidate")
                    .body("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\"><title>Request unavailable</title>"
                            + "<p>The request could not be completed. Please try again.</p>"
                            + "<a href=\"https://authprod.supermeapp.com/login\">Open sign in</a></html>");
        }

        return redirectToLogin();
    }

    private ResponseEntity<Void> redirectToLogin() {
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(LOGIN_URI)
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .build();
    }

    private boolean isLoginPage(Object originalUri) {
        if (!(originalUri instanceof String path)) {
            return false;
        }
        return "/login".equals(path) || "/adminlogin".equals(path) || "/apklogin".equals(path);
    }

    private boolean isProtocolEndpoint(Object originalUri) {
        if (!(originalUri instanceof String path)) {
            return false;
        }
        return path.startsWith("/oauth2/") || path.startsWith("/.well-known/")
                || path.startsWith("/connect/") || path.startsWith("/api/") || path.startsWith("/v1/");
    }

    private HttpStatus resolveStatus(HttpServletRequest request) {
        Object statusAttribute = request.getAttribute(RequestDispatcher.ERROR_STATUS_CODE);
        if (statusAttribute instanceof Number statusNumber) {
            HttpStatus resolved = HttpStatus.resolve(statusNumber.intValue());
            if (resolved != null) {
                return resolved;
            }
        }
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
}
