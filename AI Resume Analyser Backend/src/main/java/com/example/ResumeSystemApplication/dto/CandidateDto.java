package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateDto {
    private Long applicationId;
    private Long resumeId;
    private Long candidateId;
    private String name;
    private String email;
    private String fileName;
    private String status;
    private String applicationSource;
    private String batchId;
    private String recruiterFeedback;
    private Double matchScore;
    private Double skillMatchScore;
    private Double experienceScore;
    private Double impactScore;
    private LocalDateTime appliedAt;
    private String executiveSummary;
    private boolean cheatDetected;
    private List<String> cheatFlags;
    private List<String> matchedSkills;
    private List<String> missingSkills;
    private List<AiEvaluationResponse.InterviewQuestionItem> interviewQuestions;
    private String rawSkillGapJson;
}
