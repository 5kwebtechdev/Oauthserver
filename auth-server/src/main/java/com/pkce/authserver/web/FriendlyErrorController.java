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

import java.util.Map;

/**
 * Replaces Spring Boot's default Whitelabel error page with a safe, generic response.
 * Keep the actual status code for callers and monitoring, but never expose framework
 * details or stack traces to a browser.
 */
@Controller
public class FriendlyErrorController implements ErrorController {

    private static final String MESSAGE = "Something went wrong. Please refresh the page and try again.";

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
        return ResponseEntity.status(status)
                .contentType(MediaType.TEXT_HTML)
                .header("Cache-Control", "no-store, no-cache, must-revalidate")
                .body("""
                        <!doctype html>
                        <html lang="en">
                          <head>
                            <meta charset="utf-8">
                            <meta name="viewport" content="width=device-width, initial-scale=1">
                            <meta name="robots" content="noindex, nofollow">
                            <title>Request could not be completed</title>
                            <style>
                              body { margin: 0; min-height: 100vh; display: grid; place-items: center;
                                padding: 24px; box-sizing: border-box; background: #f7f4fb;
                                color: #29233a; font: 16px/1.5 system-ui, sans-serif; }
                              main { max-width: 32rem; padding: 32px; border-radius: 16px;
                                background: white; box-shadow: 0 8px 32px #29233a18; text-align: center; }
                              h1 { margin-top: 0; font-size: 1.5rem; }
                              a { display: inline-block; margin-top: 12px; color: #583296; }
                            </style>
                          </head>
                          <body><main><h1>We couldn't complete that request</h1>
                            <p>Something went wrong. Please refresh the page and try again.</p>
                            <a href="/login">Return to sign in</a>
                          </main></body>
                        </html>
                        """);
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
