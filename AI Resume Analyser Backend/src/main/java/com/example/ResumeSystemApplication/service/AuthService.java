package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AuthRequest;
import com.example.ResumeSystemApplication.dto.AuthResponse;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.model.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface AuthService {
    AuthResponse register(Map<String, String> request);
    AuthResponse registerCandidateWithTunnel(MultipartFile file, Map<String, String> candidateData);
    Map<String, Object> requestRecruiterAccess(Map<String, String> request);
    Map<String, Object> verifyRecruiterToken(String token);
    Map<String, Object> verifyRecruiterOtp(String token, String otp);
    Map<String, Object> submitRecruiterApplication(MultipartFile verificationDocument, Map<String, String> data);
    AuthResponse registerRecruiterWithTunnel(MultipartFile verificationDocument, Map<String, String> recruiterData);
    AuthResponse login(AuthRequest request);
    Map<String, Object> forgotPassword(String email);
    Map<String, Object> verifyResetToken(String token);
    Map<String, Object> resetPassword(String token, String newPassword);
    User getCurrentUser();
    UserDto getCurrentUserDto();
}
