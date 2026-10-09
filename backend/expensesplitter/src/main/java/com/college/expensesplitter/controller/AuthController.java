package com.college.expensesplitter.controller;

import com.college.expensesplitter.dto.AuthResponse;
import com.college.expensesplitter.dto.LoginRequest;
import com.college.expensesplitter.dto.MessageResponse;
import com.college.expensesplitter.dto.SendOtpRequest;
import com.college.expensesplitter.dto.SignupRequest;
import com.college.expensesplitter.service.AuthService;
import com.college.expensesplitter.service.OtpService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    public AuthController(AuthService authService, OtpService otpService) {
        this.authService = authService;
        this.otpService = otpService;
    }

    @PostMapping("/send-otp")
    public ResponseEntity<MessageResponse> sendOtp(
            @Valid @RequestBody SendOtpRequest request) {
        otpService.registerOtp(request.getEmail(), request.getOtp());
        return ResponseEntity.ok(new MessageResponse("Verification code registered successfully."));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(
            @Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.signup(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}
