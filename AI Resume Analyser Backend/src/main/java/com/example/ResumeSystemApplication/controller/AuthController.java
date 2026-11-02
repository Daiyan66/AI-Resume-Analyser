package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.dto.AuthRequest;
import com.example.ResumeSystemApplication.dto.AuthResponse;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping(value = "/register-candidate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AuthResponse> registerCandidate(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, String> data
    ) {
        return ResponseEntity.ok(authService.registerCandidateWithTunnel(file, data));
    }

    @PostMapping("/recruiter-request-access")
    public ResponseEntity<Map<String, Object>> requestRecruiterAccess(@RequestBody Map<String, String> request) {
        return ResponseEntity.ok(authService.requestRecruiterAccess(request));
    }

    @GetMapping("/verify-recruiter-token")
    public ResponseEntity<Map<String, Object>> verifyRecruiterToken(@RequestParam("token") String token) {
        return ResponseEntity.ok(authService.verifyRecruiterToken(token));
    }

    @PostMapping(value = "/register-recruiter", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AuthResponse> registerRecruiter(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam Map<String, String> data
    ) {
        return ResponseEntity.ok(authService.registerRecruiterWithTunnel(file, data));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUserDto());
    }
}
