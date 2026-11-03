package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.Set;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private Set<String> roles;
    private Boolean optInForRecommendations;

    // Candidate Profile
    private String phone;
    private String location;
    private String headline;
    private String educationLevel;
    private String fieldOfStudy;
    private String university;
    private String graduationYear;
    private Integer yearsExperience;
    private String currentCompany;
    private String currentTitle;
    private String skillsSummary;
    private String portfolioUrl;

    // Recruiter Profile
    private String companyName;
    private String companyWebsite;
    private String designation;
    private String hiringDomains;
    private Boolean isVerified;
    private Long applicationsCount;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
