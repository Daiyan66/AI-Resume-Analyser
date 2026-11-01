package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SkillGapAnalysisDto {
    private Long applicationId;
    private Long jobId;
    private String jobTitle;
    private Long candidateId;
    private String candidateName;
    private String recruiterFeedback;
    private Double matchScore;
    private Double skillMatchScore;
    private Double experienceScore;
    private Double impactScore;
    private Double domainScore;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private List<String> bonusSkills;
    private String executiveSummary;
    private boolean cheatDetected;
    private List<String> cheatFlags;
    private List<AiEvaluationResponse.InterviewQuestionItem> interviewQuestions;
    private AiEvaluationResponse.SkillGapCoachingReport coachingReport;
}
