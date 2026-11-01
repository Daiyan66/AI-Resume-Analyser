package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;

public interface EmailService {
    void sendRecruiterInvite(String toEmail, String name, String tempPassword);
    void sendApplicationAccepted(String toEmail, String candidateName, String jobTitle);
    void sendApplicationRejected(String toEmail, String candidateName, String jobTitle, String feedback, AiEvaluationResponse.SkillGapCoachingReport coachingReport);
    void sendJobRecommendation(String toEmail, String candidateName, String jobTitle, double matchScore);
}
