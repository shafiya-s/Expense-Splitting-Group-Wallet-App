package com.college.expensesplitter.service;

import com.college.expensesplitter.model.entity.OtpVerification;
import com.college.expensesplitter.repository.OtpVerificationRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class OtpService {

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;

    private final OtpVerificationRepository otpVerificationRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    public OtpService(
            OtpVerificationRepository otpVerificationRepository,
            UserRepository userRepository,
            EmailService emailService,
            PasswordEncoder passwordEncoder) {
        this.otpVerificationRepository = otpVerificationRepository;
        this.userRepository = userRepository;
        this.emailService = emailService;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void generateAndSendOtp(String rawEmail) {
        String email = rawEmail.trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email is already registered");
        }

        // Check 60s resend cooldown on previous active OTP
        otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email)
                .ifPresent(latestOtp -> {
                    LocalDateTime cooldownEndsAt = latestOtp.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS);
                    if (LocalDateTime.now().isBefore(cooldownEndsAt)) {
                        long secondsLeft = Duration.between(LocalDateTime.now(), cooldownEndsAt).getSeconds();
                        long displaySeconds = Math.max(1, secondsLeft);
                        throw new RuntimeException("Please wait " + displaySeconds + " seconds before requesting a new OTP.");
                    }
                });

        // Invalidate all previous active OTPs for this email
        List<OtpVerification> previousOtps = otpVerificationRepository.findByEmailAndIsUsedFalse(email);
        for (OtpVerification otp : previousOtps) {
            otp.setUsed(true);
        }
        if (!previousOtps.isEmpty()) {
            otpVerificationRepository.saveAll(previousOtps);
        }

        // Generate 6-digit numeric OTP
        int otpNumber = 100000 + secureRandom.nextInt(900000);
        String rawOtp = String.valueOf(otpNumber);

        // Hash OTP before storing
        String hashedOtp = passwordEncoder.encode(rawOtp);

        OtpVerification newOtpRecord = OtpVerification.builder()
                .email(email)
                .hashedOtp(hashedOtp)
                .createdAt(LocalDateTime.now())
                .expiresAt(LocalDateTime.now().plusMinutes(OTP_EXPIRY_MINUTES))
                .attempts(0)
                .isUsed(false)
                .build();

        otpVerificationRepository.save(newOtpRecord);

        // Send email via Gmail SMTP
        emailService.sendOtpEmail(email, rawOtp);
    }

    @Transactional
    public OtpVerification validateOtp(String rawEmail, String submittedOtp) {
        String email = rawEmail.trim().toLowerCase();

        OtpVerification otpRecord = otpVerificationRepository
                .findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new RuntimeException("No active OTP found. Please request a new OTP."));

        // Check expiration
        if (otpRecord.getExpiresAt().isBefore(LocalDateTime.now())) {
            otpRecord.setUsed(true);
            otpVerificationRepository.save(otpRecord);
            throw new RuntimeException("OTP has expired. Please request a new OTP.");
        }

        // Check attempt limit
        if (otpRecord.getAttempts() >= MAX_ATTEMPTS) {
            otpRecord.setUsed(true);
            otpVerificationRepository.save(otpRecord);
            throw new RuntimeException("Maximum verification attempts reached. Please request a new OTP.");
        }

        // Verify hash
        if (!passwordEncoder.matches(submittedOtp, otpRecord.getHashedOtp())) {
            int currentAttempts = otpRecord.getAttempts() + 1;
            otpRecord.setAttempts(currentAttempts);

            if (currentAttempts >= MAX_ATTEMPTS) {
                otpRecord.setUsed(true);
                otpVerificationRepository.save(otpRecord);
                throw new RuntimeException("Invalid OTP. Maximum verification attempts reached. Please request a new OTP.");
            } else {
                otpVerificationRepository.save(otpRecord);
                int attemptsLeft = MAX_ATTEMPTS - currentAttempts;
                throw new RuntimeException("Invalid OTP. " + attemptsLeft + " attempt" + (attemptsLeft > 1 ? "s" : "") + " remaining.");
            }
        }

        return otpRecord;
    }

    @Transactional
    public void consumeOtp(OtpVerification otpRecord) {
        if (otpRecord != null) {
            otpRecord.setUsed(true);
            otpVerificationRepository.save(otpRecord);
        }
    }
}
