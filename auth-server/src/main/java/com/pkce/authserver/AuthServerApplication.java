package com.pkce.authserver;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * @EnableAsync backs EmailService.sendOtpEmail - see its Javadoc for why OTP email
 * delivery specifically needs to not block the HTTP response thread.
 */
@SpringBootApplication
@EnableAsync
public class AuthServerApplication {

    public static void main(String[] args) {
        SpringApplication.run(AuthServerApplication.class, args);
    }
}
