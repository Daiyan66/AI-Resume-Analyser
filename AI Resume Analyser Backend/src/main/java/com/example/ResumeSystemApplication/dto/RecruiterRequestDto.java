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
public class RecruiterRequestDto {
    private Long id;
    private String name;
    private String email;
    private String companyName;
    private String companyWebsite;
    private String designation;
    private String phone;
    private String hiringDomains;
    private String verificationDocPath;
    private boolean hasDocument;
    private boolean otpVerified;
    private String status;
    private String inviteToken;
    private String otp;
    private boolean isUsed;
    private boolean isExpired;
    private String onboardingLink;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
}
