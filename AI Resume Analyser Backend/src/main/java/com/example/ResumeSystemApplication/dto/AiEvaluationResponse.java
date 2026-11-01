package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiEvaluationResponse {
    private double overallScore;
    private double skillMatchScore;       // 35% Hard Skill Alignment
    private double experienceScore;       // 25% Experience Depth & Seniority
    private double impactScore;           // 25% Project Impact & STAR Metric Quality
    private double domainScore;           // 15% Domain & Education Fit

    @Builder.Default
    private List<String> matchedSkills = new ArrayList<>();

    @Builder.Default
    private List<String> missingSkills = new ArrayList<>();

    @Builder.Default
    private List<String> bonusSkills = new ArrayList<>();

    private String executiveSummary;

    // AI Cheat & ATS Gaming Detector
    private boolean cheatDetected;
    @Builder.Default
    private List<String> cheatFlags = new ArrayList<>();

    // Tailored Interview Questions & 1-5 Rubrics
    @Builder.Default
    private List<InterviewQuestionItem> interviewQuestions = new ArrayList<>();

    // Actionable Candidate Skill Gap Coaching Report
    private SkillGapCoachingReport coachingReport;

    // Extracted Candidate Profile Info
    private ExtractedProfile extractedProfile;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InterviewQuestionItem {
        private String question;
        private String targetSkillOrClaim;
        private String rubricLevel1; // 1: Unsatisfactory / Inaccurate
        private String rubricLevel3; // 3: Competent / Standard
        private String rubricLevel5; // 5: Exceptional / Deep Expert
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SkillGapCoachingReport {
        @Builder.Default
        private List<String> missingSkills = new ArrayList<>();
        @Builder.Default
        private List<String> recommendedCertifications = new ArrayList<>();
        @Builder.Default
        private List<String> recommendedProjects = new ArrayList<>();
        @Builder.Default
        private List<String> studyTopics = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ExtractedProfile {
        private String candidateName;
        private String email;
        private String phone;
        private String education;
        private Integer yearsExperience;
        @Builder.Default
        private List<String> skills = new ArrayList<>();
    }
}
