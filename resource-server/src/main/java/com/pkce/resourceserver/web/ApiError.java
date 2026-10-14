package com.pkce.resourceserver.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/** Single consistent JSON error shape for both filter-level and controller-level failures. */
public final class ApiError {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private ApiError() {
    }

    public static Map<String, Object> body(int status, String error, String message, String path) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("timestamp", Instant.now().toString());
        payload.put("status", status);
        payload.put("error", error);
        payload.put("message", message);
        payload.put("path", path);
        return payload;
    }

    public static void write(HttpServletRequest request, HttpServletResponse response,
                              int status, String error, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        MAPPER.writeValue(response.getWriter(), body(status, error, message, request.getRequestURI()));
    }
}
