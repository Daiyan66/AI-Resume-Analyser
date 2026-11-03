package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;

import java.util.List;

public interface AdminService {
    AdminStatsDto getAdminStats();
    List<UserDto> getAllUsers();
    List<RecruiterOverviewDto> getAllRecruiters();
    List<JobDto> getJobsByRecruiter(Long recruiterId);
    List<CandidateDto> getCandidatesForJob(Long jobId);
    List<UserDto> getAllCandidates();
    List<ApplicationDto> getApplicationsByCandidate(Long candidateId);
    UserDto createRecruiter(CreateRecruiterDto dto);
    UserDto updateUser(Long id, UserDto dto);
    void deleteUser(Long id);
}
