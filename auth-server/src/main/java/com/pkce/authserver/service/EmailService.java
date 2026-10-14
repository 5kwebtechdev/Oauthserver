package com.pkce.authserver.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Sends real one-time codes by email (Gmail SMTP - see application.yml/.env.example).
 * Plain text only: a verification code has nothing worth HTML formatting, and plain text
 * avoids giving a spoofable "from" page any visual credibility.
 *
 * @Async: the SMTP round trip (hundreds of ms+) must not run on the HTTP request thread.
 * Two reasons, not just one - a slow/down mail provider must never turn into a hung or
 * failed request for the caller, and ForgotPasswordController's "same response either
 * way" anti-enumeration design (an account with no email on file no-ops in the time it
 * takes one DB query, versus a real SMTP send for one that has an email) would otherwise
 * leak which case happened through response latency alone, even though the response
 * *body* is identical either way. Nothing here returns a value the caller could wait on
 * anyway, so fire-and-forget is correct: a failure is logged and otherwise invisible to
 * the HTTP caller, same as a legitimate code simply never arriving.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class EmailService {

    private final JavaMailSender mailSender;

    @Async
    public void sendOtpEmail(String to, String code) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        message.setSubject("Your verification code");
        message.setText("Your verification code is: " + code + "\n\n"
                + "It expires in " + OtpService.EXPIRY_MINUTES
                + " minutes. If you didn't request this, you can ignore this email.\n\n"
                + "- PKCE OAuth Demo");
        try {
            mailSender.send(message);
            log.info("OTP email sent to {}", to);
        } catch (MailException e) {
            log.error("Failed to send OTP email to {}: {}", to, e.getMessage());
        }
    }

    /**
     * Copied from SuperMeBE's EmailService.sendHtmlMail, for the SuperMeBE-compatible flows: a
     * SuperMeApp user who receives a plain-text code here and a branded one from the real backend
     * would reasonably doubt which is genuine, so those flows send their exact templates
     * (see com.pkce.authserver.compat.SupermeEmailTemplates).
     *
     * Not @Async, unlike the plain sender above: theirs throws on failure and its callers report
     * that to the user, which only works if the send happens on the request thread. The
     * anti-enumeration reasoning that forces async above does not apply - their flows answer 404
     * for an unknown address anyway, so the timing reveals nothing the body does not.
     */
    public void sendHtmlMail(String to, String subject, String htmlContent) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("HTML email sent to: {}", to);
        } catch (MessagingException | MailException e) {
            log.error("Failed to send HTML email to {}: {}", to, e.getMessage());
            throw new IllegalStateException("Failed to send email. Please try again later.", e);
        }
    }
}
