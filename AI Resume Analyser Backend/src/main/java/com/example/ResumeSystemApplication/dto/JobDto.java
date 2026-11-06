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
public class JobDto {
    private Long id;
    private String title;
    private String description;
    private String skillsRequired;
    private String educationLevel;
    private Integer experienceRequired;
    private Long createdById;
    private String createdByName;
    private Integer applicantCount;
    private String appliedStatus;
    private Boolean canApply;
    private LocalDateTime reapplyEligibleAt;
    private Long daysUntilReapply;
    private String cooldownReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
