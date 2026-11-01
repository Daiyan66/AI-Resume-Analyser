package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

public interface RecruiterService {
    RecruiterStatsDto getRecruiterStats();
    JobDto createJob(JobFormDto formDto);
    JobDto uploadJobDescription(MultipartFile file);
    void saveAndProcessBatchResumes(Long jobId, List<MultipartFile> files);
    void processBatchResumesAsync(Long jobId, List<MultipartFile> files);
    List<CandidateDto> getCandidatesForJob(Long jobId);
    List<CandidateDto> getLatestBatchResults(Long jobId);
    ApplicationDto acceptCandidate(Long applicationId);
    ApplicationDto rejectCandidate(Long applicationId, Map<String, String> payload);
    List<JobDto> getRecruiterJobs();
}
