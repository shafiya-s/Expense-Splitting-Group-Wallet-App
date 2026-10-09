package com.college.expensesplitter.service;

import com.college.expensesplitter.model.entity.OtpVerification;
import com.college.expensesplitter.repository.OtpVerificationRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock
    private OtpVerificationRepository otpVerificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private PasswordEncoder passwordEncoder;

    private OtpService otpService;

    @BeforeEach
    void setUp() {
        otpService = new OtpService(otpVerificationRepository, userRepository, emailService, passwordEncoder);
    }

    @Test
    @DisplayName("generateAndSendOtp throws exception when email already registered")
    void generateAndSendOtp_ExistingUser_ThrowsException() {
        when(userRepository.existsByEmail("shafiyacse@gmail.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                otpService.generateAndSendOtp("shafiyacse@gmail.com")
        );

        assertEquals("Email is already registered", ex.getMessage());
        verify(emailService, never()).sendOtpEmail(any(), any());
    }

    @Test
    @DisplayName("generateAndSendOtp enforces 60s cooldown on active OTP")
    void generateAndSendOtp_CooldownEnforced() {
        String email = "newuser@example.com";
        OtpVerification activeOtp = OtpVerification.builder()
                .email(email)
                .createdAt(LocalDateTime.now().minusSeconds(20))
                .isUsed(false)
                .build();

        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(activeOtp));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                otpService.generateAndSendOtp(email)
        );

        assertTrue(ex.getMessage().contains("Please wait"));
        verify(emailService, never()).sendOtpEmail(any(), any());
    }

    @Test
    @DisplayName("generateAndSendOtp successfully creates OTP and dispatches email")
    void generateAndSendOtp_Success() {
        String email = "newuser@example.com";

        when(userRepository.existsByEmail(email)).thenReturn(false);
        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.empty());
        when(otpVerificationRepository.findByEmailAndIsUsedFalse(email))
                .thenReturn(Collections.emptyList());
        when(passwordEncoder.encode(any())).thenReturn("hashedCode");

        otpService.generateAndSendOtp(email);

        verify(otpVerificationRepository).save(argThat(otp ->
                otp.getEmail().equals(email) &&
                otp.getAttempts() == 0 &&
                !otp.isUsed() &&
                otp.getHashedOtp().equals("hashedCode")
        ));
        verify(emailService).sendOtpEmail(eq(email), anyString());
    }

    @Test
    @DisplayName("validateOtp throws exception when no active OTP exists")
    void validateOtp_NoActiveOtp_ThrowsException() {
        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc("user@example.com"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                otpService.validateOtp("user@example.com", "123456")
        );

        assertEquals("No active OTP found. Please request a new OTP.", ex.getMessage());
    }

    @Test
    @DisplayName("validateOtp throws exception when OTP is expired")
    void validateOtp_ExpiredOtp_ThrowsException() {
        String email = "user@example.com";
        OtpVerification expiredOtp = OtpVerification.builder()
                .email(email)
                .expiresAt(LocalDateTime.now().minusMinutes(1))
                .attempts(0)
                .isUsed(false)
                .build();

        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(expiredOtp));

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                otpService.validateOtp(email, "123456")
        );

        assertEquals("OTP has expired. Please request a new OTP.", ex.getMessage());
        assertTrue(expiredOtp.isUsed());
        verify(otpVerificationRepository).save(expiredOtp);
    }

    @Test
    @DisplayName("validateOtp tracks failed attempts and throws remaining attempts message")
    void validateOtp_WrongOtp_IncrementsAttempts() {
        String email = "user@example.com";
        OtpVerification otpRecord = OtpVerification.builder()
                .email(email)
                .hashedOtp("correctHash")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .attempts(1)
                .isUsed(false)
                .build();

        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(otpRecord));
        when(passwordEncoder.matches("999999", "correctHash")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () ->
                otpService.validateOtp(email, "999999")
        );

        assertEquals(2, otpRecord.getAttempts());
        assertTrue(ex.getMessage().contains("3 attempts remaining"));
        verify(otpVerificationRepository).save(otpRecord);
    }

    @Test
    @DisplayName("validateOtp succeeds on valid OTP code")
    void validateOtp_ValidOtp_Success() {
        String email = "user@example.com";
        OtpVerification otpRecord = OtpVerification.builder()
                .email(email)
                .hashedOtp("correctHash")
                .expiresAt(LocalDateTime.now().plusMinutes(4))
                .attempts(0)
                .isUsed(false)
                .build();

        when(otpVerificationRepository.findTopByEmailAndIsUsedFalseOrderByCreatedAtDesc(email))
                .thenReturn(Optional.of(otpRecord));
        when(passwordEncoder.matches("123456", "correctHash")).thenReturn(true);

        OtpVerification result = otpService.validateOtp(email, "123456");

        assertNotNull(result);
        assertEquals(email, result.getEmail());
    }
}
