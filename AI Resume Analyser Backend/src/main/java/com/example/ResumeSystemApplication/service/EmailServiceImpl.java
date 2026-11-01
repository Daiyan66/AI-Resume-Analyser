package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${mail.sender.name:ATS Recruitment Platform}")
    private String senderName;

    @Override
    @Async
    public void sendRecruiterInvite(String toEmail, String name, String tempPassword) {
        String subject = "Welcome to Next-Gen ATS: Your Recruiter Account Credentials";
        String htmlContent = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Welcome to Next-Gen ATS Recruitment</h2>
                <p>Hello <strong>%s</strong>,</p>
                <p>An administrator has provisioned a Recruiter account for you on the Next-Gen AI-Powered Applicant Tracking System.</p>
                <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0;"><strong>Login URL:</strong> <a href="http://localhost:5173/login">http://localhost:5173/login</a></p>
                    <p style="margin: 0 0 10px 0;"><strong>Username:</strong> %s</p>
                    <p style="margin: 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">%s</code></p>
                </div>
                <p>Please log in and update your password immediately upon your first sign in.</p>
                <br>
                <p style="color: #64748b; font-size: 13px;">This is an automated system notification.</p>
            </div>
            """, name, toEmail, tempPassword);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendApplicationAccepted(String toEmail, String candidateName, String jobTitle) {
        String subject = "Congratulations! Next Steps for " + jobTitle;
        String htmlContent = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #16a34a;">Application Shortlisted!</h2>
                <p>Dear <strong>%s</strong>,</p>
                <p>We are delighted to inform you that following your AI-assisted resume screening for the <strong>%s</strong> role, your application has been shortlisted for interviews!</p>
                <p>Our recruitment team will contact you shortly with interview scheduling details and preparation notes.</p>
                <br>
                <p>Best regards,<br>The Recruitment Team</p>
            </div>
            """, candidateName, jobTitle);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendApplicationRejected(String toEmail, String candidateName, String jobTitle, String feedback, AiEvaluationResponse.SkillGapCoachingReport coachingReport) {
        String subject = "Application Update & Skill Gap Coaching Report for " + jobTitle;

        StringBuilder coachingHtml = new StringBuilder();
        if (coachingReport != null) {
            coachingHtml.append("<div style='background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin-top: 15px;'>");
            coachingHtml.append("<h4 style='color: #0f172a; margin-top: 0;'>Actionable Skill Gap Coaching Report</h4>");
            if (coachingReport.getMissingSkills() != null && !coachingReport.getMissingSkills().isEmpty()) {
                coachingHtml.append("<p><strong>Skills to Strengthen:</strong> ").append(String.join(", ", coachingReport.getMissingSkills())).append("</p>");
            }
            if (coachingReport.getRecommendedCertifications() != null && !coachingReport.getRecommendedCertifications().isEmpty()) {
                coachingHtml.append("<p><strong>Recommended Certifications:</strong></p><ul>");
                for (String cert : coachingReport.getRecommendedCertifications()) {
                    coachingHtml.append("<li>").append(cert).append("</li>");
                }
                coachingHtml.append("</ul>");
            }
            if (coachingReport.getRecommendedProjects() != null && !coachingReport.getRecommendedProjects().isEmpty()) {
                coachingHtml.append("<p><strong>Recommended Portfolio Projects:</strong></p><ul>");
                for (String proj : coachingReport.getRecommendedProjects()) {
                    coachingHtml.append("<li>").append(proj).append("</li>");
                }
                coachingHtml.append("</ul>");
            }
            coachingHtml.append("</div>");
        }

        String htmlContent = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #334155;">Application Status Update</h2>
                <p>Dear <strong>%s</strong>,</p>
                <p>Thank you for your interest in the <strong>%s</strong> position. While we were impressed with your qualifications, our hiring team has decided to proceed with other applicants whose experience aligns closer with our current project timeline.</p>
                <p><strong>Recruiter Feedback:</strong> %s</p>
                %s
                <p style="margin-top: 20px;">We encourage you to review the coaching insights above and explore future opportunities with our team.</p>
                <br>
                <p>Best regards,<br>The Recruitment Team</p>
            </div>
            """, candidateName, jobTitle, feedback != null ? feedback : "We appreciate the time you dedicated to applying.", coachingHtml.toString());

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendJobRecommendation(String toEmail, String candidateName, String jobTitle, double matchScore) {
        String subject = "New Job Opportunity Matching Your Profile: " + jobTitle;
        String htmlContent = String.format("""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #4f46e5;">Proactive Job Recommendation</h2>
                <p>Hello <strong>%s</strong>,</p>
                <p>Our autonomous background matching engine detected a newly posted position that closely matches your skills with a <strong>%d%% fit score</strong>!</p>
                <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 12px; margin: 15px 0;">
                    <h3 style="margin: 0 0 5px 0; color: #312e81;">%s</h3>
                    <p style="margin: 0; color: #4338ca;">Estimated Match: %d%%</p>
                </div>
                <p>Log in to view the job requirements and submit your 1-click application:</p>
                <p><a href="http://localhost:5173/candidate/jobs" style="display: inline-block; background-color: #4f46e5; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Opportunity</a></p>
                <br>
                <p style="color: #64748b; font-size: 13px;">You are receiving this because you opted in to proactive job alerts.</p>
            </div>
            """, candidateName, (int) matchScore, jobTitle, (int) matchScore);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        log.info("Sending Email to [{}]: Subject: {}", to, subject);
        if (mailSender == null || fromEmail == null || fromEmail.isBlank()) {
            log.info("Mail sender not actively configured with live credentials. Simulated email delivery to: {}", to);
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail, senderName);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            mailSender.send(message);
            log.info("Successfully dispatched email to {}", to);
        } catch (Exception e) {
            log.warn("Failed to dispatch email to {}. Error: {}", to, e.getMessage());
        }
    }
}
