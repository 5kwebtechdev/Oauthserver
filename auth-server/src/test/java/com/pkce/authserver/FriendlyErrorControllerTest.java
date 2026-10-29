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
    void browserErrorKeepsStatusAndShowsRefreshInstructions() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept", "text/html,application/xhtml+xml");
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 403);

        var response = controller.error(request);

        assertThat(response.getStatusCode().value()).isEqualTo(403);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.TEXT_HTML);
        assertThat(response.getBody().toString()).contains("Please refresh the page and try again.")
                .doesNotContain("Whitelabel Error Page");
    }

    @Test
    void jsonErrorDoesNotExposeFrameworkDetails() {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Accept", MediaType.APPLICATION_JSON_VALUE);
        request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, 500);

        var response = controller.error(request);

        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getHeaders().getContentType()).isEqualTo(MediaType.APPLICATION_JSON);
        assertThat(response.getBody()).asString().contains("Please refresh the page and try again.")
                .doesNotContain("Whitelabel", "stack trace");
    }
}
