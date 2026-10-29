package com.pkce.authserver;

import com.pkce.authserver.web.FriendlyErrorController;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class FriendlyErrorControllerTest {

    private final FriendlyErrorController controller = new FriendlyErrorController();

    @Test
    void browserErrorRedirectsToAuthServerSignIn() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept", "text/html,application/xhtml+xml");
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 403);
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/protected/page");

        var response = controller.error(request);

        assertThat(response.getStatusCode().value()).isEqualTo(302);
        assertThat(response.getHeaders().getLocation()).hasToString("https://authprod.supermeapp.com/login");
    }

    @Test
    void loginPageErrorShowsRetryLinkWithoutRedirectLoop() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept", "text/html,application/xhtml+xml");
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 500);
        request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/login");

        var response = controller.error(request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().toString()).contains("https://authprod.supermeapp.com/login");
        assertThat(response.getBody().toString()).doesNotContain("Whitelabel Error Page");
    }

    @Test
    void jsonErrorDoesNotExposeFrameworkDetails() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept", MediaType.APPLICATION_JSON_VALUE);
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 500);

        var response = controller.error(request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).asString().contains("Please try again.")
                .doesNotContain("Whitelabel", "stack trace");
    }
}
