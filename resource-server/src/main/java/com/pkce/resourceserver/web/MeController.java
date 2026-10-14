package com.pkce.resourceserver.web;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class MeController {

    @GetMapping("/api/me")
    public Map<String, Object> me(JwtAuthenticationToken authentication) {
        Jwt jwt = authentication.getToken();
        List<String> authorities = authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("sub", jwt.getSubject());
        response.put("scope", jwt.getClaimAsString("scope") == null ? "" : jwt.getClaimAsString("scope"));
        response.put("roles", jwt.getClaimAsStringList("roles") == null ? List.of() : jwt.getClaimAsStringList("roles"));
        response.put("authorities", authorities);
        response.put("issuedAt", jwt.getIssuedAt());
        response.put("expiresAt", jwt.getExpiresAt());
        return response;
    }
}
