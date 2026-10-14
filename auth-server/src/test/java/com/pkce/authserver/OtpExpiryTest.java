package com.pkce.authserver;

import com.pkce.authserver.compat.SupermeEmailTemplates;
import com.pkce.authserver.service.OtpService;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * An emailed code's lifetime is quoted to the user inside the email, so the number in the text and
 * the number the server enforces have to be the same one. They were separate constants (10 minutes
 * in this project's own flow, 5 in the ported SuperMeBE ones) until the expiry was set to 2
 * minutes; this guards against them drifting apart again, which would have the email state a
 * deadline the server does not honour.
 */
class OtpExpiryTest {

    @Test
    void everyFlowUsesTheSameTwoMinuteExpiry() {
        assertThat(OtpService.EXPIRY_MINUTES).isEqualTo(2);
        assertThat(SupermeEmailTemplates.OTP_EXPIRY_MINUTES).isEqualTo(OtpService.EXPIRY_MINUTES);
    }

    @Test
    void bothBrandedEmailsQuoteThatSameExpiry() {
        String expected = OtpService.EXPIRY_MINUTES + " minutes";

        String verification = SupermeEmailTemplates.otpVerification("1234");
        assertThat(verification).contains("This code expires in <strong style=\"color:#111827;\">" + expected);
        assertThat(verification).contains("Expires in " + expected);

        String reset = SupermeEmailTemplates.passwordReset("5678");
        assertThat(reset).contains("This code expires in <strong style=\"color:#111827;\">" + expected);
        assertThat(reset).contains("Expires in " + expected);
        assertThat(reset).contains("This link expires in " + expected);
    }
}
