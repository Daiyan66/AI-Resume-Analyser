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

    @PostMapping("/verify-recruiter-otp")
    public ResponseEntity<Map<String, Object>> verifyRecruiterOtp(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String otp = request.get("otp");
        return ResponseEntity.ok(authService.verifyRecruiterOtp(token, otp));
    }

    @PostMapping(value = "/submit-recruiter-application", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> submitRecruiterApplication(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "verificationDoc", required = false) MultipartFile verificationDoc,
            @RequestParam(value = "verificationDocument", required = false) MultipartFile verificationDocument,
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestParam Map<String, String> data
    ) {
        MultipartFile doc = file != null ? file : (verificationDoc != null ? verificationDoc : verificationDocument);
        Map<String, String> mergedData = new java.util.HashMap<>(data);
        if (tokenParam != null && !tokenParam.isBlank() && !mergedData.containsKey("token")) {
            mergedData.put("token", tokenParam);
        }
        return ResponseEntity.ok(authService.submitRecruiterApplication(doc, mergedData));
    }

    @PostMapping(value = "/register-recruiter", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<AuthResponse> registerRecruiter(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "verificationDoc", required = false) MultipartFile verificationDoc,
            @RequestParam(value = "verificationDocument", required = false) MultipartFile verificationDocument,
            @RequestParam(value = "token", required = false) String tokenParam,
            @RequestParam Map<String, String> data
    ) {
        MultipartFile doc = file != null ? file : (verificationDoc != null ? verificationDoc : verificationDocument);
        Map<String, String> mergedData = new java.util.HashMap<>(data);
        if (tokenParam != null && !tokenParam.isBlank() && !mergedData.containsKey("token")) {
            mergedData.put("token", tokenParam);
        }
        return ResponseEntity.ok(authService.registerRecruiterWithTunnel(doc, mergedData));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(authService.forgotPassword(payload.get("email")));
    }

    @GetMapping("/verify-reset-token")
    public ResponseEntity<Map<String, Object>> verifyResetToken(@RequestParam("token") String token) {
        return ResponseEntity.ok(authService.verifyResetToken(token));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, Object>> resetPassword(@RequestBody Map<String, String> payload) {
        return ResponseEntity.ok(authService.resetPassword(payload.get("token"), payload.get("newPassword")));
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser() {
        return ResponseEntity.ok(authService.getCurrentUserDto());
    }
}
