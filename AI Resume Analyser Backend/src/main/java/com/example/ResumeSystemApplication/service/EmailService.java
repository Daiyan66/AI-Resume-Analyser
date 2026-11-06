package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;

public interface EmailService {
    void sendRecruiterInvite(String toEmail, String name, String activationUrl);
    void sendRecruiterVerificationLink(String toEmail, String name, String companyName, String inviteToken, String otp);
    void sendRecruiterApprovalAndSetupLink(String toEmail, String name, String companyName, String resetToken);
    void sendAdminRecruiterRequestAlert(String toAdminEmail, String requesterName, String companyName, String requesterEmail, String otp);
    void sendAdminRecruiterReviewAlert(String toAdminEmail, String requesterName, String companyName, String requesterEmail);
    void sendCandidatePositionClosedAlert(String toEmail, String candidateName, String jobTitle, String companyName);
    void sendPasswordResetLink(String toEmail, String name, String resetToken);
    void sendApplicationAccepted(String toEmail, String candidateName, String jobTitle);
    void sendApplicationRejected(String toEmail, String candidateName, String jobTitle, String feedback, AiEvaluationResponse.SkillGapCoachingReport coachingReport);
    void sendJobRecommendation(String toEmail, String candidateName, String jobTitle, double matchScore);
    void sendReapplyInvitationEmail(String toEmail, String candidateName, String jobTitle, String companyName, Long jobId);
}
