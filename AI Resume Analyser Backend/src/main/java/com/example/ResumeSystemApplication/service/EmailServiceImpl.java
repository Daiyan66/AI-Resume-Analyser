package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Properties;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.host:smtp.gmail.com}")
    private String mailHost;

    @Value("${spring.mail.port:587}")
    private int mailPort;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${mail.sender.name:ATS Recruitment Platform}")
    private String senderName;

    private synchronized JavaMailSender getActiveMailSender() {
        if (this.mailSender != null) {
            return this.mailSender;
        }
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(mailHost != null && !mailHost.isBlank() ? mailHost : "smtp.gmail.com");
        impl.setPort(mailPort > 0 ? mailPort : 587);
        impl.setUsername(fromEmail != null && !fromEmail.isBlank() ? fromEmail : "noreply@atsplatform.com");
        impl.setPassword(mailPassword != null ? mailPassword : "");

        Properties props = impl.getJavaMailProperties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        this.mailSender = impl;
        return this.mailSender;
    }

    @Override
    @Async
    public void sendRecruiterInvite(String toEmail, String name, String activationUrl) {
        String subject = "Exclusive Partnership Offer: Enterprise Recruiter Access Invitation";
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- Gradient Banner Header -->
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 50%%, #06b6d4 100%%); padding: 40px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 9999px; margin-bottom: 14px;">
                            ⭐ EXCLUSIVE ENTERPRISE OFFER
                        </span>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to the Next-Gen ATS Network</h1>
                        <p style="margin: 10px 0 0 0; color: #c7d2fe; font-size: 15px;">Your Corporate Recruiter Access Seat is Provisioned</p>
                    </div>

                    <!-- Main Body -->
                    <div style="padding: 36px 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="font-size: 16px; margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>We are delighted to extend an official enterprise partnership offer to join the <strong>Next-Gen AI ATS Platform</strong> as an authorized hiring manager. Your corporate recruitment workstation is prepared.</p>
                        
                        <!-- Offer Benefits Box -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px 24px; margin: 26px 0;">
                            <h3 style="margin: 0 0 14px 0; font-size: 15px; color: #312e81; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">
                                What Your Corporate Access Includes:
                            </h3>
                            <table style="width: 100%%; border-collapse: collapse; font-size: 14px; color: #334155;">
                                <tr>
                                    <td style="padding: 6px 0; vertical-align: top; width: 28px;">⚡</td>
                                    <td style="padding: 6px 0;"><strong>Autonomous Gemini AI Screening:</strong> Screen hundreds of resumes against custom JDs in seconds.</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; vertical-align: top;">🎯</td>
                                    <td style="padding: 6px 0;"><strong>Skill Gap & Fit Scoring:</strong> Automated semantic matching, qualification breakdowns, and candidate tiering.</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; vertical-align: top;">📊</td>
                                    <td style="padding: 6px 0;"><strong>Batch ATS Ingestion:</strong> Dedicated bulk candidate management and individual application workflows.</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; vertical-align: top;">🛡️</td>
                                    <td style="padding: 6px 0;"><strong>Verified Recruiter Badge:</strong> Exclusive access to verified talent pools.</td>
                                </tr>
                            </table>
                        </div>

                        <!-- Confidentiality & Security Notice (No Plain Credentials) -->
                        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 16px 20px; margin: 24px 0;">
                            <p style="margin: 0; color: #166534; font-size: 13.5px;">
                                🔒 <strong>Zero-Trust Credential Security:</strong> For maximum account integrity, passwords are not sent via plain text. Please use the secure invitation link below to claim your offer and set your personal master password.
                            </p>
                        </div>

                        <!-- Call to Action -->
                        <div style="text-align: center; margin: 32px 0 24px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.4); letter-spacing: 0.3px;">
                                Claim Offer & Activate Recruiter Seat &rarr;
                            </a>
                        </div>
                        <p style="text-align: center; margin: 0; font-size: 12px; color: #94a3b8;">
                            Activation link expires in 7 days. If the button doesn't open, copy and paste this URL into your browser:<br>
                            <span style="color: #6366f1; word-break: break-all;">%s</span>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
                        <p style="margin: 0 0 6px 0;">Next-Gen AI Applicant Tracking System &bull; Enterprise Partner Program</p>
                        <p style="margin: 0; color: #94a3b8;">Confidential &bull; Sent exclusively to %s</p>
                    </div>
                </div>
            </body>
            </html>
            """, name != null && !name.isBlank() ? name : "Hiring Partner", activationUrl, activationUrl, toEmail);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendRecruiterVerificationLink(String toEmail, String name, String companyName, String inviteToken, String otp) {
        String subject = "Exclusive Enterprise Recruiter Offer & 2FA Verification Link";
        String onboardUrl = "http://localhost:5173/recruiter/onboard?token=" + inviteToken;

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- Banner Header -->
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 50%%, #06b6d4 100%%); padding: 40px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 9999px; margin-bottom: 14px;">
                            🚀 ENTERPRISE PARTNERSHIP INVITATION
                        </span>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Corporate Recruiter Access Offer</h1>
                        <p style="margin: 10px 0 0 0; color: #c7d2fe; font-size: 15px;">Next-Gen AI ATS Platform &bull; Corporate Verification</p>
                    </div>

                    <!-- Content Body -->
                    <div style="padding: 36px 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="font-size: 16px; margin-top: 0;">Hello <strong>%s</strong>,</p>
                        <p>Thank you for expressing interest in bringing <strong>%s</strong> onto the Next-Gen AI Talent Acquisition Network. We are pleased to extend an enterprise recruiter access offer to your team.</p>
                        
                        <p>To uphold the highest quality standards for all candidates and partner organizations, recruiter accounts undergo swift 2-Factor OTP verification followed by formal organizational credentialing.</p>

                        <!-- Styled OTP Code Vault -->
                        <div style="background: linear-gradient(135deg, #eff6ff 0%%, #e0e7ff 100%%); border: 2px dashed #6366f1; border-radius: 14px; padding: 24px; margin: 26px 0; text-align: center;">
                            <span style="display: inline-block; font-size: 11.5px; text-transform: uppercase; color: #4338ca; font-weight: 800; letter-spacing: 1.5px; margin-bottom: 8px;">
                                Your 6-Digit Email Verification Code
                            </span>
                            <div style="font-size: 38px; font-weight: 800; letter-spacing: 12px; color: #1e1b4b; font-family: 'Courier New', Courier, monospace; margin: 6px 0;">
                                %s
                            </div>
                            <p style="margin: 6px 0 0 0; font-size: 12px; color: #6366f1; font-weight: 600;">
                                Valid for 48 hours &bull; Single-use verification code
                            </p>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 32px 0 20px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); color: #ffffff; padding: 16px 36px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.4); letter-spacing: 0.3px;">
                                Claim Offer & Complete Onboarding &rarr;
                            </a>
                        </div>

                        <!-- Steps Guide -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 22px; font-size: 13.5px; color: #475569; margin-top: 24px;">
                            <strong style="color: #1e293b;">Next Steps to Finalize Your Seat:</strong>
                            <ol style="margin: 8px 0 0 0; padding-left: 20px; line-height: 1.7;">
                                <li>Submit the 6-digit OTP code shown above.</li>
                                <li>Upload a formal organizational verification document (Company ID, Employment Offer Letter, or Corporate Registration).</li>
                                <li>Configure your corporate profile & create your secure password to begin screening resumes.</li>
                            </ol>
                        </div>

                        <p style="font-size: 12px; color: #94a3b8; margin-top: 26px;">
                            If you did not request recruiter corporate access, you can disregard this email. Support inquiries: formusic7766@gmail.com
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b;">
                        <p style="margin: 0 0 6px 0;">Next-Gen AI Applicant Tracking System &bull; Recruitment Management</p>
                        <p style="margin: 0; color: #94a3b8;">Sent to %s</p>
                    </div>
                </div>
            </body>
            </html>
            """, 
            name != null && !name.isBlank() ? name : "Hiring Partner", 
            companyName != null && !companyName.isBlank() ? companyName : "your organization",
            otp, onboardUrl, toEmail);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendAdminRecruiterRequestAlert(String toAdminEmail, String requesterName, String companyName, String requesterEmail, String otp) {
        String subject = "[Action Required] New Recruiter Corporate Access Request: " + requesterName + " (" + companyName + ")";
        String adminPortalUrl = "http://localhost:5173/admin/recruiter-requests";
        String gmailSearchUrl = "https://mail.google.com/mail/u/0/#search/" + requesterEmail;

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <div style="background: linear-gradient(135deg, #0f172a 0%%, #1e293b 100%%); padding: 32px; color: #ffffff;">
                        <span style="display: inline-block; background: #3b82f6; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; margin-bottom: 12px;">
                            ADMIN NOTIFICATION &bull; RECRUITER APPLICATION
                        </span>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">New Recruiter Corporate Access Request</h2>
                    </div>

                    <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14.5px;">
                        <p style="margin-top: 0;">Hello Administrator,</p>
                        <p>A new recruiter has submitted an application for corporate access on the platform. Review details below:</p>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
                            <table style="width: 100%%; font-size: 14px; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b; width: 140px;"><strong>Applicant:</strong></td>
                                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;"><strong>Company:</strong></td>
                                    <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;"><strong>Corporate Email:</strong></td>
                                    <td style="padding: 6px 0; color: #2563eb; font-weight: 600;">%s</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748b;"><strong>Generated OTP:</strong></td>
                                    <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-size: 16px; font-weight: 700;">%s</td>
                                </tr>
                            </table>
                        </div>

                        <div style="margin: 28px 0; display: flex; gap: 12px; text-align: center;">
                            <a href="%s" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; margin-right: 10px;">
                                Manage Request in Admin Portal &rarr;
                            </a>
                            <a href="%s" target="_blank" style="display: inline-block; background-color: #ea4335; color: #ffffff; padding: 12px 20px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
                                Open in Gmail &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, requesterName, companyName, requesterEmail, otp, adminPortalUrl, gmailSearchUrl);

        sendHtmlEmail(toAdminEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendAdminRecruiterReviewAlert(String toAdminEmail, String requesterName, String companyName, String requesterEmail) {
        String subject = "[Review Required] Recruiter Profile & Proof Submitted: " + requesterName + " (" + companyName + ")";
        String adminPortalUrl = "http://localhost:5173/admin/recruiter-requests";
        String gmailSearchUrl = "https://mail.google.com/mail/u/0/#search/" + requesterEmail;

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 100%%); padding: 32px; color: #ffffff;">
                        <span style="display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 12px; border-radius: 6px; margin-bottom: 12px;">
                            OTP VERIFIED &bull; READY FOR APPROVAL
                        </span>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Recruiter Credentials & Proof Submitted</h2>
                    </div>

                    <div style="padding: 30px; color: #334155; line-height: 1.6; font-size: 14.5px;">
                        <p style="margin-top: 0;">Hello Administrator,</p>
                        <p><strong>%s</strong> from <strong>%s</strong> has completed 2FA OTP verification and submitted their formal corporate verification document and company profile for administrative approval.</p>

                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin: 20px 0;">
                            <p style="margin: 0 0 8px 0; color: #0f172a; font-weight: 700;">Applicant Summary:</p>
                            <p style="margin: 0 0 4px 0;"><strong>Name:</strong> %s</p>
                            <p style="margin: 0 0 4px 0;"><strong>Company:</strong> %s</p>
                            <p style="margin: 0;"><strong>Email:</strong> <span style="color: #4f46e5;">%s</span></p>
                        </div>

                        <p>Please examine the uploaded document and company credentials in the Admin Portal. If satisfied, click <strong>"Approve & Send Password Setup Link"</strong> to grant corporate recruiter access.</p>

                        <div style="margin: 28px 0; display: flex; gap: 12px; text-align: center;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); color: #ffffff; padding: 13px 26px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; margin-right: 10px;">
                                Review & Approve Recruiter &rarr;
                            </a>
                            <a href="%s" target="_blank" style="display: inline-block; background-color: #ea4335; color: #ffffff; padding: 13px 20px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px;">
                                Open in Gmail &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, requesterName, companyName, requesterName, companyName, requesterEmail, adminPortalUrl, gmailSearchUrl);

        sendHtmlEmail(toAdminEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendRecruiterApprovalAndSetupLink(String toEmail, String name, String companyName, String resetToken) {
        String subject = "Congratulations! Your Recruiter Access is Approved - Set Your Master Password";
        String setupUrl = "http://localhost:5173/reset-password?token=" + resetToken;

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- Gradient Banner Header -->
                    <div style="background: linear-gradient(135deg, #065f46 0%%, #059669 50%%, #0284c7 100%%); padding: 40px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 9999px; margin-bottom: 14px;">
                            🎉 APPLICATION APPROVED
                        </span>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Welcome to Next-Gen ATS!</h1>
                        <p style="margin: 10px 0 0 0; color: #a7f3d0; font-size: 15px;">Your Corporate Recruiter Account for %s is Activated</p>
                    </div>

                    <!-- Content Body -->
                    <div style="padding: 36px 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="font-size: 16px; margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>We are delighted to inform you that following administrative examination of your submitted company credentials and verification documentation, your Enterprise Recruiter Account has been <strong>officially approved</strong>!</p>
                        
                        <p>To finalize your corporate seat and access your recruitment dashboard, please click the secure link below to set your master password:</p>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 34px 0 26px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #059669 0%%, #0284c7 100%%); color: #ffffff; padding: 16px 38px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(5, 150, 105, 0.4); letter-spacing: 0.3px;">
                                Set Master Password & Log In &rarr;
                            </a>
                        </div>

                        <p style="text-align: center; margin: 0; font-size: 12px; color: #94a3b8;">
                            This setup link is valid for 7 days. If the button above does not work, copy and paste this URL:<br>
                            <span style="color: #059669; word-break: break-all;">%s</span>
                        </p>

                        <!-- Quick Feature Recap -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 22px; margin-top: 26px; font-size: 13.5px; color: #475569;">
                            <strong style="color: #0f172a;">Once logged in, you can immediately:</strong>
                            <ul style="margin: 6px 0 0 0; padding-left: 20px; line-height: 1.6;">
                                <li>Post new job descriptions with automated AI skill mapping.</li>
                                <li>Screen batch resumes in bulk with instant fit and experience scoring.</li>
                                <li>Inspect individual candidate applications and dispatch interview feedback.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center; font-size: 12px; color: #64748b;">
                        Next-Gen AI Applicant Tracking System &bull; Recruiter Partner Services
                    </div>
                </div>
            </body>
            </html>
            """, companyName, name != null && !name.isBlank() ? name : "Hiring Partner", setupUrl, setupUrl);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendCandidatePositionClosedAlert(String toEmail, String candidateName, String jobTitle, String companyName) {
        String subject = "Application Update: Requisition Concluded for " + jobTitle;
        String browseJobsUrl = "http://localhost:5173/candidate/jobs";

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <div style="background: linear-gradient(135deg, #1e293b 0%%, #334155 100%%); padding: 32px; color: #ffffff; text-align: center;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.15); color: #e2e8f0; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 9999px; margin-bottom: 10px;">
                            APPLICATION STATUS UPDATE
                        </span>
                        <h2 style="margin: 0; font-size: 22px; font-weight: 700;">Position Update for %s</h2>
                    </div>

                    <div style="padding: 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>We are writing to update you regarding your application for the <strong>%s</strong> position with <strong>%s</strong>.</p>
                        
                        <div style="background-color: #f8fafc; border-left: 4px solid #64748b; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                            <p style="margin: 0; color: #334155; font-size: 14.5px;">
                                The hiring team has concluded recruitment for this specific vacancy, and the requisition has been closed. While you weren't selected to advance for this particular opening, your resume demonstrated valuable strengths and background.
                            </p>
                        </div>

                        <p>
                            Don't lose momentum — our AI matching engine continues to monitor active openings and will recommend positions aligning with your skill profile.
                        </p>

                        <div style="text-align: center; margin: 28px 0;">
                            <a href="%s" style="display: inline-block; background: #4f46e5; color: #ffffff; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14.5px;">
                                Browse Matching Opportunities &rarr;
                            </a>
                        </div>

                        <p style="color: #64748b; font-size: 13px; margin-top: 24px;">
                            Keep learning, refining your projects, and applying — best of luck on your recruitment journey!
                        </p>
                    </div>

                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
                        Next-Gen AI ATS Platform &bull; Candidate Career Services
                    </div>
                </div>
            </body>
            </html>
            """, jobTitle, candidateName != null && !candidateName.isBlank() ? candidateName : "Applicant", jobTitle, companyName != null && !companyName.isBlank() ? companyName : "the hiring organization", browseJobsUrl);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendPasswordResetLink(String toEmail, String name, String resetToken) {
        String subject = "Reset Your Password - Next-Gen ATS Platform";
        String resetUrl = "http://localhost:5173/reset-password?token=" + resetToken;

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 100%%); padding: 36px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 9999px; margin-bottom: 10px;">
                            SECURITY & ACCESS
                        </span>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Password Reset Request</h2>
                    </div>

                    <div style="padding: 36px 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="margin-top: 0;">Hello <strong>%s</strong>,</p>
                        <p>We received a request to reset the password for your account linked to <strong>%s</strong>.</p>
                        <p>Click the secure button below to choose your new password. This link is valid for 1 hour:</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%%, #7c3aed 100%%); color: #ffffff; padding: 15px 32px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 14px 0 rgba(79, 70, 229, 0.35);">
                                Reset My Password &rarr;
                            </a>
                        </div>

                        <p style="color: #64748b; font-size: 13px;">If you did not initiate a password reset, you can safely ignore this email. Your credentials remain safe.</p>
                        <p style="color: #94a3b8; font-size: 12px; word-break: break-all; margin-top: 20px;">
                            Link: %s
                        </p>
                    </div>

                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
                        Next-Gen AI ATS Platform &bull; Security Team
                    </div>
                </div>
            </body>
            </html>
            """, name != null && !name.isBlank() ? name : "User", toEmail, resetUrl, resetUrl);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendApplicationAccepted(String toEmail, String candidateName, String jobTitle) {
        String subject = "Congratulations! Next Steps for " + jobTitle;
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #15803d 0%%, #16a34a 100%%); padding: 36px 32px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 24px;">Application Shortlisted!</h2>
                        <p style="margin: 8px 0 0 0; color: #dcfce7;">Next-Gen AI ATS Interview Invitation</p>
                    </div>
                    <div style="padding: 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>We are delighted to inform you that following your AI-assisted resume screening for the <strong>%s</strong> role, your application has been shortlisted for interviews!</p>
                        <p>Our recruitment team will contact you shortly with interview scheduling details and preparation notes.</p>
                        <br>
                        <p>Best regards,<br><strong>The Recruitment Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendApplicationRejected(String toEmail, String candidateName, String jobTitle, String feedback, AiEvaluationResponse.SkillGapCoachingReport coachingReport) {
        String subject = "Application Update & Skill Gap Coaching Report for " + jobTitle;

        StringBuilder coachingHtml = new StringBuilder();
        if (coachingReport != null) {
            coachingHtml.append("<div style='background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 18px; border-radius: 10px; margin-top: 20px;'>");
            coachingHtml.append("<h4 style='color: #0f172a; margin-top: 0;'>Actionable Skill Gap Coaching Report</h4>");
            if (coachingReport.getMissingSkills() != null && !coachingReport.getMissingSkills().isEmpty()) {
                coachingHtml.append("<p style='margin: 6px 0;'><strong>Skills to Strengthen:</strong> ").append(String.join(", ", coachingReport.getMissingSkills())).append("</p>");
            }
            if (coachingReport.getRecommendedCertifications() != null && !coachingReport.getRecommendedCertifications().isEmpty()) {
                coachingHtml.append("<p style='margin: 10px 0 4px 0;'><strong>Recommended Certifications:</strong></p><ul style='margin: 0; padding-left: 20px;'>");
                for (String cert : coachingReport.getRecommendedCertifications()) {
                    coachingHtml.append("<li>").append(cert).append("</li>");
                }
                coachingHtml.append("</ul>");
            }
            if (coachingReport.getRecommendedProjects() != null && !coachingReport.getRecommendedProjects().isEmpty()) {
                coachingHtml.append("<p style='margin: 10px 0 4px 0;'><strong>Recommended Portfolio Projects:</strong></p><ul style='margin: 0; padding-left: 20px;'>");
                for (String proj : coachingReport.getRecommendedProjects()) {
                    coachingHtml.append("<li>").append(proj).append("</li>");
                }
                coachingHtml.append("</ul>");
            }
            coachingHtml.append("</div>");
        }

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #334155 0%%, #475569 100%%); padding: 32px; text-align: center; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 22px;">Application Status Update</h2>
                    </div>
                    <div style="padding: 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>Thank you for your interest in the <strong>%s</strong> position. While we were impressed with your qualifications, our hiring team has decided to proceed with other applicants whose experience aligns closer with our current project timeline.</p>
                        <p><strong>Recruiter Feedback:</strong> %s</p>
                        %s
                        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 10px; padding: 18px 20px; margin: 24px 0; font-size: 14px; color: #1e3a8a;">
                            <strong style="display: block; margin-bottom: 6px; font-size: 15px;">⏳ 3-Month Skill Enhancement Window & Auto-Invitation:</strong>
                            <p style="margin: 0; line-height: 1.6;">
                                In accordance with our hiring protocols, a <strong>3-month cooldown period</strong> applies to this position to give you dedicated time to strengthen the skill gaps outlined above. Once your 3-month window elapses, our system will <strong>automatically send you an email invitation</strong> inviting you to re-apply with your updated resume!
                            </p>
                        </div>
                        <p style="margin-top: 20px;">We encourage you to review the coaching insights above and explore future opportunities with our team.</p>
                        <br>
                        <p>Best regards,<br><strong>The Recruitment Team</strong></p>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle, feedback != null ? feedback : "We appreciate the time you dedicated to applying.", coachingHtml.toString());

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendJobRecommendation(String toEmail, String candidateName, String jobTitle, double matchScore) {
        String subject = "New Job Opportunity Matching Your Profile: " + jobTitle;
        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #4338ca 100%%); padding: 36px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; padding: 4px 14px; border-radius: 9999px; margin-bottom: 10px;">
                            AI TALENT MATCH
                        </span>
                        <h2 style="margin: 0; font-size: 24px; font-weight: 700;">Proactive Job Recommendation</h2>
                    </div>
                    <div style="padding: 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="margin-top: 0;">Hello <strong>%s</strong>,</p>
                        <p>Our autonomous background matching engine detected a newly posted position that closely matches your skills with a <strong>%d%%%% fit score</strong>!</p>
                        <div style="background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 14px 18px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                            <h3 style="margin: 0 0 6px 0; color: #312e81;">%s</h3>
                            <p style="margin: 0; color: #4338ca; font-weight: 600;">Estimated Match: %d%%%%</p>
                        </div>
                        <p>Log in to view the job requirements and submit your 1-click application:</p>
                        <div style="text-align: center; margin: 26px 0;">
                            <a href="http://localhost:5173/candidate/jobs" style="display: inline-block; background: #4f46e5; color: white; padding: 13px 28px; text-decoration: none; border-radius: 8px; font-weight: 700;">View Opportunity &rarr;</a>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, (int) matchScore, jobTitle, (int) matchScore);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    @Override
    @Async
    public void sendReapplyInvitationEmail(String toEmail, String candidateName, String jobTitle, String companyName, Long jobId) {
        String subject = "🌟 3-Month Cooldown Concluded: You Are Eligible to Re-Apply for " + jobTitle;
        String jobBoardUrl = "http://localhost:5173/candidate/jobs" + (jobId != null ? "?jobId=" + jobId : "");

        String htmlContent = String.format("""
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"></head>
            <body style="margin: 0; padding: 24px; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <div style="max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
                    
                    <!-- Header -->
                    <div style="background: linear-gradient(135deg, #0f172a 0%%, #2563eb 50%%, #059669 100%%); padding: 40px 32px; text-align: center; color: #ffffff;">
                        <span style="display: inline-block; background: rgba(255, 255, 255, 0.2); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.35); color: #ffffff; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 16px; border-radius: 9999px; margin-bottom: 14px;">
                            ⭐ 3-MONTH COOLDOWN CONCLUDED
                        </span>
                        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">Ready to Try Again?</h1>
                        <p style="margin: 10px 0 0 0; color: #c7d2fe; font-size: 15px;">Opportunity to re-apply for %s at %s</p>
                    </div>

                    <!-- Body -->
                    <div style="padding: 36px 32px; color: #1e293b; line-height: 1.65; font-size: 15px;">
                        <p style="font-size: 16px; margin-top: 0;">Dear <strong>%s</strong>,</p>
                        <p>We are delighted to let you know that your <strong>3-month skill enhancement cooldown period</strong> for the <strong>%s</strong> opening has officially concluded!</p>
                        
                        <p>In technology and recruitment, skills, projects, and domain mastery evolve quickly. If you have acquired new skills, completed hands-on projects, or updated your resume, our hiring team warmly welcomes you to submit your updated credentials.</p>

                        <!-- Highlights Box -->
                        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px 24px; margin: 26px 0;">
                            <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 800;">
                                Recommended Next Steps:
                            </h3>
                            <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                                <li>Review the current job description and skill benchmarks.</li>
                                <li>Ensure your latest certifications and portfolio projects are reflected on your resume.</li>
                                <li>Submit your updated resume with instant AI fit and multi-pillar evaluation.</li>
                            </ul>
                        </div>

                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 34px 0 26px 0;">
                            <a href="%s" style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%%, #059669 100%%); color: #ffffff; padding: 16px 38px; text-decoration: none; border-radius: 10px; font-weight: 800; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.4); letter-spacing: 0.3px;">
                                Submit Updated Application &rarr;
                            </a>
                        </div>

                        <p style="text-align: center; margin: 0; font-size: 12px; color: #94a3b8;">
                            If the button above does not open directly, copy and paste this link:<br>
                            <span style="color: #2563eb; word-break: break-all;">%s</span>
                        </p>
                    </div>

                    <!-- Footer -->
                    <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center; font-size: 12px; color: #64748b;">
                        Next-Gen AI ATS Platform &bull; Career Mobility & Re-application Services
                    </div>
                </div>
            </body>
            </html>
            """, jobTitle, companyName, candidateName != null && !candidateName.isBlank() ? candidateName : "Candidate", jobTitle, jobBoardUrl, jobBoardUrl);

        sendHtmlEmail(toEmail, subject, htmlContent);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        log.info("Preparing live email dispatch to [{}]: Subject: {}", to, subject);
        try {
            JavaMailSender sender = getActiveMailSender();
            String effectiveFrom = fromEmail != null && !fromEmail.isBlank() ? fromEmail : "formusic7766@gmail.com";
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(effectiveFrom, senderName != null ? senderName : "ATS Recruitment Platform");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlBody, true);
            sender.send(message);
            log.info(">>> LIVE EMAIL DISPATCHED SUCCESSFULLY TO: {}", to);
        } catch (Exception e) {
            log.error(">>> FAILED TO DISPATCH EMAIL TO {}. Error: {}", to, e.getMessage(), e);
        }
    }
}
