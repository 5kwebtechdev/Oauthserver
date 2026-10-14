package com.pkce.authserver.security;

import com.pkce.authserver.service.SecurityEventService;
import com.pkce.authserver.service.SecurityEventType;
import com.pkce.authserver.service.TurnstileVerificationService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * /login is handled entirely by Spring Security's own UsernamePasswordAuthenticationFilter,
 * not a controller this app owns, so there's nowhere to hook in a captcha check except a
 * filter placed just before it. Cloudflare's widget auto-injects a hidden
 * "cf-turnstile-response" field into whatever <form> it's rendered inside - see
 * LoginPageController - so this reads that same form field name.
 */
public class TurnstileLoginFilter extends OncePerRequestFilter {

    private final TurnstileVerificationService turnstileVerificationService;
    private final SecurityEventService securityEventService;

    public TurnstileLoginFilter(TurnstileVerificationService turnstileVerificationService,
                                 SecurityEventService securityEventService) {
        this.turnstileVerificationService = turnstileVerificationService;
        this.securityEventService = securityEventService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        boolean isLoginSubmit = "POST".equalsIgnoreCase(request.getMethod()) && request.getRequestURI().endsWith("/login");
        if (isLoginSubmit) {
            String token = request.getParameter("cf-turnstile-response");
            if (!turnstileVerificationService.verify(token, request.getRemoteAddr())) {
                securityEventService.record(SecurityEventType.CAPTCHA_FAILED,
                        request.getParameter("username"), request.getRemoteAddr(), "/login form");
                response.sendRedirect(request.getContextPath() + "/login?error&captcha=1");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
