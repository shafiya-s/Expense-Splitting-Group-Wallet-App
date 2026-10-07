package com.college.expensesplitter.service;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import com.resend.services.emails.model.CreateEmailResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    private static final String SENDER_EMAIL = "Expense Splitter <onboarding@resend.dev>";

    @Value("${resend.api.key:}")
    private String resendApiKey;

    public void sendOtpEmail(String toEmail, String otp) {
        String apiKey = (resendApiKey != null && !resendApiKey.isBlank())
                ? resendApiKey
                : System.getenv("RESEND_API_KEY");

        if (apiKey == null || apiKey.isBlank()) {
            logger.error("Failed to send verification email: RESEND_API_KEY is not configured.");
            throw new RuntimeException("Email service is temporarily unavailable. Please try again later.");
        }

        try {
            Resend resend = new Resend(apiKey);

            String htmlBody = String.format(
                "<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1c1614;\">" +
                "<h2 style=\"color: #1c1614; margin-bottom: 20px;\">Expense Splitter</h2>" +
                "<p>Hello,</p>" +
                "<p>Your verification code for Expense Splitter is:</p>" +
                "<div style=\"background-color: #f6f3ed; border: 1px solid #e5ded2; border-radius: 8px; padding: 16px; margin: 24px 0; text-align: center;\">" +
                "<span style=\"font-size: 28px; font-weight: bold; letter-spacing: 6px; font-family: monospace; color: #1c1614;\">%s</span>" +
                "</div>" +
                "<p>This code is <strong>valid for 5 minutes</strong>. Please do not share this code with anyone.</p>" +
                "<p style=\"color: #5e534b; font-size: 14px;\">If you did not request this verification code, please ignore this email.</p>" +
                "<br/>" +
                "<p>Best regards,<br/><strong>Expense Splitter Team</strong></p>" +
                "</div>",
                otp
            );

            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(SENDER_EMAIL)
                    .to(toEmail)
                    .subject("Expense Splitter - Verification Code")
                    .html(htmlBody)
                    .build();

            CreateEmailResponse response = resend.emails().send(params);

            if (response == null || response.getId() == null || response.getId().isBlank()) {
                logger.error("Resend API failed to return a valid email ID for the dispatched email.");
                throw new RuntimeException("Failed to send verification email.");
            }

            logger.info("Verification email successfully dispatched via Resend (Email ID: {}).", response.getId());
        } catch (Exception e) {
            logger.error("Failed to dispatch verification email via Resend: {}", e.getMessage());
            throw new RuntimeException("Failed to send verification email. Please try again later.", e);
        }
    }
}
