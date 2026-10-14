package com.pkce.authserver.compat;

import com.pkce.authserver.service.OtpService;

/**
 * The two branded OTP emails SuperMeBE sends, copied verbatim from OtpServiceImpl.buildOtpEmailHtml
 * and ForgotPasswordServiceImpl.buildResetEmail.
 *
 * Kept byte-for-byte rather than rewritten: a SuperMeApp user who gets a bare plain-text code from
 * this server and a branded one from the real backend has every reason to doubt which is genuine,
 * which is exactly the instinct a phishing attempt relies on. The verification mail is the indigo
 * one, the reset mail the red/orange one - that colour difference is theirs and carries meaning
 * ("action required"), so it is preserved too.
 */
public final class SupermeEmailTemplates {

    /**
     * Both of their flows quote the expiry in the body, so this tracks the one value the rest of
     * the app uses rather than restating it. SuperMeBE's own is 5 minutes; this deployment runs a
     * shorter window, and because the templates interpolate the constant the emails stay truthful.
     */
    public static final int OTP_EXPIRY_MINUTES = OtpService.EXPIRY_MINUTES;

    public static final String OTP_SUBJECT = "Your OTP Verification Code - SuperMe";
    public static final String RESET_SUBJECT = "Reset Your Password - SuperMe";

    private SupermeEmailTemplates() {
    }

    public static String otpVerification(String otp) {
        return "<!DOCTYPE html>"
                + "<html lang=\"en\">"
                + "<head>"
                + "<meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">"
                + "<title>OTP Verification</title>"
                + "</head>"
                + "<body style=\"margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">"
                + "<tr><td align=\"center\" style=\"padding:40px 16px;\">"

                // Card
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\""
                + " style=\"max-width:500px;background:#ffffff;border-radius:16px;"
                + "overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);\">"

                // Header
                + "<tr><td style=\"background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);"
                + "padding:36px 40px;text-align:center;\">"
                + "<h1 style=\"color:#fff;margin:0 0 4px;font-size:26px;font-weight:700;"
                + "letter-spacing:-0.5px;\">SuperMe</h1>"
                + "<p style=\"color:rgba(255,255,255,0.75);margin:0;font-size:12px;"
                + "letter-spacing:2px;text-transform:uppercase;\">Email Verification</p>"
                + "</td></tr>"

                // Body
                + "<tr><td style=\"padding:36px 40px 28px;\">"
                + "<h2 style=\"color:#111827;font-size:20px;font-weight:600;margin:0 0 10px;\">"
                + "Verify your email</h2>"
                + "<p style=\"color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px;\">"
                + "Enter the one-time password below to complete your verification. "
                + "This code expires in <strong style=\"color:#111827;\">" + OTP_EXPIRY_MINUTES + " minutes</strong>."
                + "</p>"

                // OTP Box
                + "<div style=\"background:#f5f3ff;border:2px dashed #a5b4fc;border-radius:12px;"
                + "padding:28px 20px;text-align:center;margin-bottom:28px;\">"
                + "<p style=\"color:#7c3aed;font-size:11px;font-weight:700;letter-spacing:3px;"
                + "text-transform:uppercase;margin:0 0 14px;\">One-Time Password</p>"
                + "<div style=\"font-size:44px;font-weight:800;letter-spacing:14px;color:#4f46e5;"
                + "font-family:'Courier New',Courier,monospace;\">" + otp + "</div>"
                + "<p style=\"color:#9ca3af;font-size:12px;margin:14px 0 0;\">"
                + "&#9201;&nbsp;Expires in " + OTP_EXPIRY_MINUTES + " minutes</p>"
                + "</div>"

                // Security notice
                + "<div style=\"background:#fffbeb;border-left:3px solid #f59e0b;"
                + "border-radius:4px;padding:14px 16px;\">"
                + "<p style=\"color:#92400e;font-size:13px;margin:0;line-height:1.55;\">"
                + "<strong>&#9888; Security Notice:</strong>&nbsp;Never share this OTP with anyone. "
                + "SuperMe will never ask for your OTP via phone or email."
                + "</p>"
                + "</div>"
                + "</td></tr>"

                // Footer
                + "<tr><td style=\"background:#f9fafb;border-top:1px solid #f3f4f6;"
                + "padding:20px 40px;text-align:center;\">"
                + "<p style=\"color:#9ca3af;font-size:12px;line-height:1.6;margin:0 0 6px;\">"
                + "If you didn't request this OTP, you can safely ignore this email.</p>"
                + "<p style=\"color:#d1d5db;font-size:11px;margin:0;\">"
                + "&copy; 2025 SuperMe App &bull; All rights reserved</p>"
                + "</td></tr>"

                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body>"
                + "</html>";
    }

    public static String passwordReset(String otp) {
        return "<!DOCTYPE html>"
                + "<html lang=\"en\">"
                + "<head>"
                + "<meta charset=\"UTF-8\">"
                + "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\">"
                + "<title>Reset Password</title>"
                + "</head>"
                + "<body style=\"margin:0;padding:0;background:#f0f2f5;"
                + "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;\">"
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\">"
                + "<tr><td align=\"center\" style=\"padding:40px 16px;\">"

                // Card
                + "<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\""
                + " style=\"max-width:500px;background:#fff;border-radius:16px;"
                + "overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);\">"

                // Header - red/orange palette signals "action required"
                + "<tr><td style=\"background:linear-gradient(135deg,#f97316 0%,#ef4444 100%);"
                + "padding:36px 40px;text-align:center;\">"
                + "<h1 style=\"color:#fff;margin:0 0 4px;font-size:26px;font-weight:700;\">SuperMe</h1>"
                + "<p style=\"color:rgba(255,255,255,0.80);margin:0;font-size:12px;"
                + "letter-spacing:2px;text-transform:uppercase;\">Password Reset</p>"
                + "</td></tr>"

                // Body
                + "<tr><td style=\"padding:36px 40px 28px;\">"
                + "<h2 style=\"color:#111827;font-size:20px;font-weight:600;margin:0 0 10px;\">"
                + "Reset your password</h2>"
                + "<p style=\"color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 28px;\">"
                + "We received a request to reset your password. Use the OTP below to proceed. "
                + "This code expires in <strong style=\"color:#111827;\">" + OTP_EXPIRY_MINUTES + " minutes</strong>."
                + "</p>"

                // OTP Box
                + "<div style=\"background:#fff7ed;border:2px dashed #fb923c;border-radius:12px;"
                + "padding:28px 20px;text-align:center;margin-bottom:28px;\">"
                + "<p style=\"color:#c2410c;font-size:11px;font-weight:700;letter-spacing:3px;"
                + "text-transform:uppercase;margin:0 0 14px;\">Your Reset OTP</p>"
                + "<div style=\"font-size:44px;font-weight:800;letter-spacing:14px;color:#ea580c;"
                + "font-family:'Courier New',Courier,monospace;\">" + otp + "</div>"
                + "<p style=\"color:#9ca3af;font-size:12px;margin:14px 0 0;\">"
                + "&#9201;&nbsp;Expires in " + OTP_EXPIRY_MINUTES + " minutes</p>"
                + "</div>"

                // Warning box
                + "<div style=\"background:#fef2f2;border-left:3px solid #ef4444;"
                + "border-radius:4px;padding:14px 16px;\">"
                + "<p style=\"color:#b91c1c;font-size:13px;margin:0;line-height:1.55;\">"
                + "<strong>&#9888; Important:</strong>&nbsp;If you did not request a password reset, "
                + "your account may be at risk. Please secure your account immediately.</p>"
                + "</div>"
                + "</td></tr>"

                // Footer
                + "<tr><td style=\"background:#f9fafb;border-top:1px solid #f3f4f6;"
                + "padding:20px 40px;text-align:center;\">"
                + "<p style=\"color:#9ca3af;font-size:12px;line-height:1.6;margin:0 0 6px;\">"
                + "This link expires in " + OTP_EXPIRY_MINUTES + " minutes. Do not share this OTP with anyone.</p>"
                + "<p style=\"color:#d1d5db;font-size:11px;margin:0;\">"
                + "&copy; 2025 SuperMe App &bull; All rights reserved</p>"
                + "</td></tr>"

                + "</table>"
                + "</td></tr>"
                + "</table>"
                + "</body>"
                + "</html>";
    }
}
