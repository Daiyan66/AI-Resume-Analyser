package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface CandidateService {
    List<JobDto> getJobs(String query, String education, Integer maxExp);
    List<JobDto> getRecommendations();
    ApplyResponse applyForJob(Long jobId, MultipartFile file);
    List<ApplicationDto> getCandidateApplications();
    Map<String, Object> getLatestApplicationId();
    SkillGapAnalysisDto getSkillGapAnalysis(Long applicationId);
}
