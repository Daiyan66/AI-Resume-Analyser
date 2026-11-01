package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplicationDto {
    private Long id;
    private Long jobId;
    private String jobTitle;
    private Long resumeId;
    private Long candidateId;
    private String fileName;
    private String candidateName;
    private String candidateEmail;
    private String status;
    private String applicationSource;
    private String batchId;
    private String recruiterFeedback;
    private Double matchScore;
    private Double skillMatchScore;
    private Double experienceScore;
    private Double impactScore;
    private String rawSkillGapJson;
    private LocalDateTime appliedAt;
}
