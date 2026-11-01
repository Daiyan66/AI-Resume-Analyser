package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AdminStatsDto;
import com.example.ResumeSystemApplication.dto.CreateRecruiterDto;
import com.example.ResumeSystemApplication.dto.UserDto;

import java.util.List;

public interface AdminService {
    AdminStatsDto getAdminStats();
    List<UserDto> getAllUsers();
    UserDto createRecruiter(CreateRecruiterDto dto);
    UserDto updateUser(Long id, UserDto dto);
    void deleteUser(Long id);
}
