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
public class ResumeDto {
    private Long id;
    private Long candidateId;
    private String candidateName;
    private String candidateEmail;
    private String fileName;
    private String filePath;
    private String extractedSkills;
    private String extractedEducation;
    private Integer extractedExperience;
    private LocalDateTime uploadedAt;
}
