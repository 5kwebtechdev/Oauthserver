package com.pkce.authserver.security;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Previously every unauthenticated /oauth2/authorize request landed on "/login" first, which
 * then immediately 302ed again to "/apklogin"/"/adminlogin" once LoginPageController read the
 * saved request's client_id - correct, but a visible extra round trip. This entry point reads
 * the same client_id one hop earlier, directly off the request that is about to be saved, so
 * the first redirect already lands on the right page.
 */
class ClientAwareLoginEntryPointTest {

    private final ClientAwareLoginEntryPoint entryPoint =
            new ClientAwareLoginEntryPoint("supermeapp-dev-web", "supermeadmin-web", "supermeadmin-dev-web");

    private MockHttpServletRequest request(String clientId) {
        var request = new MockHttpServletRequest("GET", "/oauth2/authorize");
        request.setServletPath("/oauth2/authorize");
        if (clientId != null) request.setParameter("client_id", clientId);
        return request;
    }

    @Test
    void apkDevClientGoesStraightToApklogin() throws Exception {
        var response = new MockHttpServletResponse();
        entryPoint.commence(request("supermeapp-dev-web"), response, null);

        assertThat(response.getStatus()).isEqualTo(302);
        assertThat(response.getRedirectedUrl()).isEqualTo("/apklogin");
    }

    @Test
    void adminProdClientGoesStraightToAdminlogin() throws Exception {
        var response = new MockHttpServletResponse();
        entryPoint.commence(request("supermeadmin-web"), response, null);

        assertThat(response.getRedirectedUrl()).isEqualTo("/adminlogin");
    }

    @Test
    void adminDevClientGoesStraightToAdminlogin() throws Exception {
        var response = new MockHttpServletResponse();
        entryPoint.commence(request("supermeadmin-dev-web"), response, null);

        assertThat(response.getRedirectedUrl()).isEqualTo("/adminlogin");
    }

    @Test
    void anyOtherClientFallsBackToPlainLogin() throws Exception {
        var response = new MockHttpServletResponse();
        entryPoint.commence(request("supermeapp-web-4204"), response, null);

        assertThat(response.getRedirectedUrl()).isEqualTo("/login");
    }

    @Test
    void missingClientIdFallsBackToPlainLogin() throws Exception {
        var response = new MockHttpServletResponse();
        entryPoint.commence(request(null), response, null);

        assertThat(response.getRedirectedUrl()).isEqualTo("/login");
    }

    @Test
    void savesTheRequestSoLoginPageControllerAndTheSuccessHandlerCanResumeIt() throws Exception {
        var request = request("supermeapp-dev-web");
        var response = new MockHttpServletResponse();
        entryPoint.commence(request, response, null);

        var saved = request.getSession(false).getAttribute("SPRING_SECURITY_SAVED_REQUEST");
        assertThat(saved).isNotNull();
    }

    @Test
    void blankClientIdsNeverMatchAnEmptyRequestParameter() throws Exception {
        var entryPointWithNoConfiguredClients = new ClientAwareLoginEntryPoint("", "", "");
        var response = new MockHttpServletResponse();
        entryPointWithNoConfiguredClients.commence(request(""), response, null);

        assertThat(response.getRedirectedUrl()).isEqualTo("/login");
    }
}
