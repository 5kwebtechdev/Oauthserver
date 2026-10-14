package com.pkce.authserver.security;

import com.pkce.authserver.config.RateLimitProperties;
import com.pkce.authserver.service.SecurityEventService;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

/**
 * trustForwardedHeader defaults to false - see RateLimitProperties/RateLimitFilter.
 * Direct unit test (no Spring context) since the filter has no Spring-managed state
 * beyond the properties/SecurityEventService passed to its constructor; the latter is
 * just a plain Mockito mock here since these tests only care about the 429 behavior.
 */
class RateLimitFilterTest {

    private final SecurityEventService securityEventService = mock(SecurityEventService.class);

    private RateLimitProperties properties(boolean trustForwardedHeader) {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setLogin(new RateLimitProperties.Limit(2, 2, 60));
        properties.setTrustForwardedHeader(trustForwardedHeader);
        return properties;
    }

    private MockHttpServletRequest loginRequest(String remoteAddr, String forwardedFor) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/login");
        request.setRemoteAddr(remoteAddr);
        if (forwardedFor != null) {
            request.addHeader("X-Forwarded-For", forwardedFor);
        }
        return request;
    }

    @Test
    void spoofedForwardedHeader_doesNotBypassLimit_whenUntrusted() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(properties(false), securityEventService);

        int allowed = 0;
        for (int i = 0; i < 5; i++) {
            // Same real socket address every time, a DIFFERENT spoofed X-Forwarded-For on
            // each request - if the header were trusted, each would land in its own fresh
            // bucket and never get rate-limited at all.
            MockHttpServletRequest request = loginRequest("10.0.0.1", "203.0.113." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            if (response.getStatus() != 429) {
                allowed++;
            }
        }

        assertThat(allowed).isEqualTo(2);
    }

    @Test
    void forwardedHeader_doesBypassLimit_whenExplicitlyTrusted() throws Exception {
        // Documents the opt-in, reverse-proxy-only escape hatch - not the default/safe path.
        RateLimitFilter filter = new RateLimitFilter(properties(true), securityEventService);

        int allowed = 0;
        for (int i = 0; i < 5; i++) {
            MockHttpServletRequest request = loginRequest("10.0.0.1", "203.0.113." + i);
            MockHttpServletResponse response = new MockHttpServletResponse();
            filter.doFilter(request, response, new MockFilterChain());
            if (response.getStatus() != 429) {
                allowed++;
            }
        }

        assertThat(allowed).isEqualTo(5);
    }

    @Test
    void differentRealAddresses_eachGetTheirOwnBucket_regardlessOfSpoofedHeader() throws Exception {
        RateLimitFilter filter = new RateLimitFilter(properties(false), securityEventService);

        MockHttpServletRequest first = loginRequest("10.0.0.1", "9.9.9.9");
        MockHttpServletResponse firstResponse = new MockHttpServletResponse();
        filter.doFilter(first, firstResponse, new MockFilterChain());
        assertThat(firstResponse.getStatus()).isNotEqualTo(429);

        MockHttpServletRequest second = loginRequest("10.0.0.2", "9.9.9.9");
        MockHttpServletResponse secondResponse = new MockHttpServletResponse();
        filter.doFilter(second, secondResponse, new MockFilterChain());
        assertThat(secondResponse.getStatus()).isNotEqualTo(429);
    }
}
