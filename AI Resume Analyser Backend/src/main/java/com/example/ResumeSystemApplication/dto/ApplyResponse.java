package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApplyResponse {
    private Long applicationId;
    private Long jobId;
    private String jobTitle;
    private String status;
    private Double matchScore;
    private Double skillMatchScore;
    private Double experienceScore;
    private Double impactScore;
    private String executiveSummary;
    private String message;
}
