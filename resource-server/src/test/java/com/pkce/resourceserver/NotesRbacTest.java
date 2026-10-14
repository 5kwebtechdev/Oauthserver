package com.pkce.resourceserver;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Scope/role enforcement tests using Spring Security Test's jwt() post-processor, which
 * injects an already-authenticated JwtAuthenticationToken for the request - it does not
 * exercise real signature/issuer/audience validation (that's covered separately in
 * JwtDecoderValidationTest), only the authorization rules in SecurityConfig.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@AutoConfigureMockMvc
@ActiveProfiles("test")
class NotesRbacTest {

    @Autowired
    private MockMvc mockMvc;

    private SecurityMockMvcRequestPostProcessors.JwtRequestPostProcessor userJwt(String... authorities) {
        java.util.List<org.springframework.security.core.GrantedAuthority> granted = java.util.Arrays.stream(authorities)
                .<org.springframework.security.core.GrantedAuthority>map(org.springframework.security.core.authority.SimpleGrantedAuthority::new)
                .toList();
        return jwt().jwt(builder -> builder.subject("demo").claim("roles", java.util.List.of("ROLE_USER")))
                .authorities(granted);
    }

    @Test
    void me_withoutToken_isUnauthorized() throws Exception {
        mockMvc.perform(get("/api/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void me_withValidToken_isOk() throws Exception {
        mockMvc.perform(get("/api/me").with(userJwt("SCOPE_openid"))).andExpect(status().isOk());
    }

    @Test
    void listNotes_withoutReadScope_isForbidden() throws Exception {
        mockMvc.perform(get("/api/notes").with(userJwt("SCOPE_notes.write")))
                .andExpect(status().isForbidden());
    }

    @Test
    void listNotes_withReadScope_isOk() throws Exception {
        mockMvc.perform(get("/api/notes").with(userJwt("SCOPE_notes.read")))
                .andExpect(status().isOk());
    }

    @Test
    void createNote_withoutWriteScope_isForbidden() throws Exception {
        mockMvc.perform(post("/api/notes").with(userJwt("SCOPE_notes.read"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"content\":\"y\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void createNote_withWriteScope_isCreated() throws Exception {
        mockMvc.perform(post("/api/notes").with(userJwt("SCOPE_notes.write"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"x\",\"content\":\"y\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void adminNotes_withoutAdminRole_isForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/notes").with(userJwt("SCOPE_notes.read")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminNotes_withAdminRole_isOk() throws Exception {
        var adminJwt = jwt().jwt(builder -> builder.subject("admin").claim("roles", java.util.List.of("ROLE_ADMIN")))
                .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN"));
        mockMvc.perform(get("/api/admin/notes").with(adminJwt))
                .andExpect(status().isOk());
    }
}
