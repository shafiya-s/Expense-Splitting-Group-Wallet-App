package com.college.expensesplitter.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@expensesplitter.com}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Expense Splitter - Verification Code");
            
            String text = String.format(
                "Hello,\n\n" +
                "Your verification code for Expense Splitter is:\n\n" +
                "    %s\n\n" +
                "This code is valid for 5 minutes. Please do not share this code with anyone.\n\n" +
                "If you did not request this verification code, please ignore this email.\n\n" +
                "Best regards,\n" +
                "Expense Splitter Team",
                otp
            );
            
            message.setText(text);
            mailSender.send(message);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to send verification email.", e);
        }
    }
}
