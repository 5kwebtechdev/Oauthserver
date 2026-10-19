package com.pkce.authserver;

import com.pkce.authserver.security.AdminLoginContextFilter;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class HandoffLoginClientContextTest {

    @Test
    void devHandoffRequestSelectsDevAccountContextAndClearsItAfterward() throws Exception {
        var filter = new AdminLoginContextFilter("prod-client", "admin-dev", "supermeapp-dev-web");
        var request = new MockHttpServletRequest("POST", "/api/auth/handoff-login");
        request.setServletPath("/api/auth/handoff-login");
        request.setParameter("client_id", "supermeapp-dev-web");

        filter.doFilter(request, new MockHttpServletResponse(), (req, res) ->
                assertThat(AdminLoginContextFilter.currentAdminClient())
                        .isEqualTo(AdminLoginContextFilter.AdminClient.APK_DEV));

        assertThat(AdminLoginContextFilter.currentAdminClient())
                .isEqualTo(AdminLoginContextFilter.AdminClient.NONE);
    }
}
