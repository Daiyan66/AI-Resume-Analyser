package com.example.ResumeSystemApplication.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "resumes")
@Getter
@Setter
@NoArgsConstructor
public class Resume {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "candidate_id")
    private User candidate;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "file_path", nullable = false, length = 500)
    private String filePath;

    @Lob
    @Column(name = "parsed_content", columnDefinition = "LONGTEXT")
    private String parsedContent;

    @Column(name = "extracted_skills", columnDefinition = "TEXT")
    private String extractedSkills;

    @Column(name = "extracted_education", columnDefinition = "TEXT")
    private String extractedEducation;

    @Column(name = "extracted_experience")
    private Integer extractedExperience = 0;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt;

    @PrePersist
    protected void onCreate() {
        this.uploadedAt = LocalDateTime.now();
        if (this.extractedExperience == null) {
            this.extractedExperience = 0;
        }
    }
}
