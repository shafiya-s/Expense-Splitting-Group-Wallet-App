package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.AuthResponse;
import com.college.expensesplitter.dto.LoginRequest;
import com.college.expensesplitter.dto.SignupRequest;
import com.college.expensesplitter.model.entity.OtpVerification;
import com.college.expensesplitter.model.entity.User;
import com.college.expensesplitter.repository.UserRepository;
import com.college.expensesplitter.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private OtpService otpService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtUtil, otpService);
    }

    @Test
    @DisplayName("Signup succeeds when email is new and OTP is valid")
    void signup_Successful() {
        SignupRequest request = new SignupRequest();
        request.setName("Shafiya");
        request.setEmail("ShafiyaCSE@gmail.com ");
        request.setPassword("Secret123!");
        request.setOtp("123456");

        String normalizedEmail = "shafiyacse@gmail.com";
        OtpVerification mockOtp = OtpVerification.builder()
                .id(1L)
                .email(normalizedEmail)
                .build();

        when(userRepository.existsByEmail(normalizedEmail)).thenReturn(false);
        when(otpService.validateOtp(normalizedEmail, "123456")).thenReturn(mockOtp);
        when(passwordEncoder.encode("Secret123!")).thenReturn("hashedPassword");
        when(jwtUtil.generateToken(normalizedEmail)).thenReturn("mockJwtToken");

        AuthResponse response = authService.signup(request);

        assertNotNull(response);
        assertEquals(normalizedEmail, response.getEmail());
        assertEquals("Shafiya", response.getName());
        assertEquals("mockJwtToken", response.getToken());

        verify(userRepository).save(argThat(user ->
                user.getEmail().equals(normalizedEmail) &&
                user.getName().equals("Shafiya") &&
                user.getPasswordHash().equals("hashedPassword")
        ));
        verify(otpService).consumeOtp(mockOtp);
    }

    @Test
    @DisplayName("Signup throws exception when email already exists")
    void signup_EmailAlreadyExists_ThrowsException() {
        SignupRequest request = new SignupRequest();
        request.setName("Shafiya");
        request.setEmail("shafiyacse@gmail.com");
        request.setPassword("Secret123!");
        request.setOtp("123456");

        when(userRepository.existsByEmail("shafiyacse@gmail.com")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.signup(request));
        assertEquals("Email already registered", ex.getMessage());

        verify(otpService, never()).validateOtp(any(), any());
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("Login normalizes email and verifies hashed password successfully")
    void login_Successful_NormalizesEmail() {
        LoginRequest request = new LoginRequest(" ShafiyaCSE@gmail.com ", "Secret123!");
        String normalizedEmail = "shafiyacse@gmail.com";

        User mockUser = User.builder()
                .id(10L)
                .name("Shafiya")
                .email(normalizedEmail)
                .passwordHash("encodedHash")
                .build();

        when(userRepository.findByEmail(normalizedEmail)).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("Secret123!", "encodedHash")).thenReturn(true);
        when(jwtUtil.generateToken(normalizedEmail)).thenReturn("loginToken");

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals(10L, response.getUserId());
        assertEquals(normalizedEmail, response.getEmail());
        assertEquals("loginToken", response.getToken());
    }

    @Test
    @DisplayName("Login throws exception on invalid password")
    void login_InvalidPassword_ThrowsException() {
        LoginRequest request = new LoginRequest("shafiyacse@gmail.com", "WrongPassword");
        User mockUser = User.builder()
                .id(10L)
                .name("Shafiya")
                .email("shafiyacse@gmail.com")
                .passwordHash("encodedHash")
                .build();

        when(userRepository.findByEmail("shafiyacse@gmail.com")).thenReturn(Optional.of(mockUser));
        when(passwordEncoder.matches("WrongPassword", "encodedHash")).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class, () -> authService.login(request));
        assertEquals("Invalid email or password", ex.getMessage());
    }
}
