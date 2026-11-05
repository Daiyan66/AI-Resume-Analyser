package com.example.ResumeSystemApplication.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "recruiter_invitations")
@Getter
@Setter
@NoArgsConstructor
public class RecruiterInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String email;

    @Column(length = 150)
    private String name;

    @Column(name = "company_name", length = 150)
    private String companyName;

    @Column(name = "company_website", length = 255)
    private String companyWebsite;

    @Column(length = 100)
    private String designation;

    @Column(length = 50)
    private String phone;

    @Column(name = "hiring_domains", length = 255)
    private String hiringDomains;

    @Column(name = "verification_doc_path", length = 500)
    private String verificationDocPath;

    @Column(name = "invite_token", nullable = false, unique = true, length = 100)
    private String inviteToken;

    @Column(nullable = false, length = 10)
    private String otp;

    @Column(name = "otp_verified", nullable = false)
    private boolean otpVerified = false;

    @Column(name = "status", length = 50)
    private String status = "PENDING_VERIFICATION"; // PENDING_VERIFICATION, UNDER_REVIEW, APPROVED, REJECTED

    @Column(name = "is_used", nullable = false)
    private boolean isUsed = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.expiresAt == null) {
            this.expiresAt = LocalDateTime.now().plusHours(48);
        }
        if (this.status == null) {
            this.status = "PENDING_VERIFICATION";
        }
    }
}
