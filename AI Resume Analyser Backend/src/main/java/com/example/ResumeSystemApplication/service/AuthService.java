package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AuthRequest;
import com.example.ResumeSystemApplication.dto.AuthResponse;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.model.User;

import java.util.Map;

public interface AuthService {
    AuthResponse register(Map<String, String> request);
    AuthResponse login(AuthRequest request);
    User getCurrentUser();
    UserDto getCurrentUserDto();
}
