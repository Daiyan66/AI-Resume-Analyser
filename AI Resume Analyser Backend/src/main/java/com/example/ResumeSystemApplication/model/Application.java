package com.example.ResumeSystemApplication.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "applications", uniqueConstraints = {
        @UniqueConstraint(name = "uk_job_resume", columnNames = {"job_id", "resume_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class Application {

    public enum ApplicationStatus {
        PENDING,
        ACCEPTED,
        REJECTED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private JobDescription job;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resume_id", nullable = false)
    private Resume resume;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ApplicationStatus status = ApplicationStatus.PENDING;

    @Column(name = "match_score")
    private Double matchScore = 0.0;

    @Column(name = "skill_match_score")
    private Double skillMatchScore = 0.0;

    @Column(name = "experience_score")
    private Double experienceScore = 0.0;

    @Column(name = "impact_score")
    private Double impactScore = 0.0;

    @Lob
    @Column(name = "raw_skill_gap_json", columnDefinition = "LONGTEXT")
    private String rawSkillGapJson;

    @Column(name = "applied_at", nullable = false)
    private LocalDateTime appliedAt;

    @PrePersist
    protected void onCreate() {
        this.appliedAt = LocalDateTime.now();
        if (this.status == null) {
            this.status = ApplicationStatus.PENDING;
        }
        if (this.matchScore == null) this.matchScore = 0.0;
        if (this.skillMatchScore == null) this.skillMatchScore = 0.0;
        if (this.experienceScore == null) this.experienceScore = 0.0;
        if (this.impactScore == null) this.impactScore = 0.0;
    }
}
