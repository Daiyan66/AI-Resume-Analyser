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
    AuthResponse registerRecruiterWithTunnel(MultipartFile verificationDocument, Map<String, String> recruiterData);
    AuthResponse login(AuthRequest request);
    User getCurrentUser();
    UserDto getCurrentUserDto();
}
