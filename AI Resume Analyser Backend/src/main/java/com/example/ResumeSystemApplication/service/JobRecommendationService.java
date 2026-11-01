package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;
import com.example.ResumeSystemApplication.model.JobDescription;
import com.example.ResumeSystemApplication.model.Resume;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.JobRepository;
import com.example.ResumeSystemApplication.repository.ResumeRepository;
import com.example.ResumeSystemApplication.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class JobRecommendationService {

    private static final Logger log = LoggerFactory.getLogger(JobRecommendationService.class);

    private final UserRepository userRepository;
    private final ResumeRepository resumeRepository;
    private final JobRepository jobRepository;
    private final AiScreeningService aiScreeningService;
    private final EmailService emailService;

    public JobRecommendationService(
            UserRepository userRepository,
            ResumeRepository resumeRepository,
            JobRepository jobRepository,
            AiScreeningService aiScreeningService,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.resumeRepository = resumeRepository;
        this.jobRepository = jobRepository;
        this.aiScreeningService = aiScreeningService;
        this.emailService = emailService;
    }

    /**
     * Proactive Background Job Matcher:
     * Scheduled worker evaluates recent jobs against stored candidate profiles.
     * Fires automatically every 6 hours or can be triggered directly.
     */
    @Scheduled(cron = "${recommendation.cron:0 0 */6 * * *}")
    public void executeProactiveJobMatching() {
        log.info("Starting proactive background job matcher cron worker...");

        List<User> candidateList = userRepository.findUsersOptedInForRecommendations();
        List<JobDescription> recentJobs = jobRepository.findAllByOrderByCreatedAtDesc();

        if (recentJobs.isEmpty() || candidateList.isEmpty()) {
            log.info("Proactive matcher skipped: No recent jobs or candidate profiles available.");
            return;
        }

        for (User candidate : candidateList) {
            Optional<Resume> latestResume = resumeRepository.findTopByCandidateIdOrderByUploadedAtDesc(candidate.getId());
            if (latestResume.isEmpty() || latestResume.get().getParsedContent() == null) {
                continue;
            }

            for (JobDescription job : recentJobs) {
                // Check if candidate matches job requirements
                AiEvaluationResponse eval = aiScreeningService.evaluateResumeAgainstJob(
                        latestResume.get().getParsedContent(),
                        job.getTitle(),
                        job.getDescription(),
                        job.getSkillsRequired(),
                        job.getExperienceRequired()
                );

                if (eval.getOverallScore() >= 75.0) {
                    log.info("Proactive match found! Candidate: {} matched Job: {} with score: {}", candidate.getUsername(), job.getTitle(), eval.getOverallScore());
                    String candidateName = candidate.getFirstName() != null ? candidate.getFirstName() : candidate.getUsername();
                    emailService.sendJobRecommendation(candidate.getEmail(), candidateName, job.getTitle(), eval.getOverallScore());
                    break; // Recommend one top match per cycle per candidate
                }
            }
        }

        log.info("Proactive background job matcher finished evaluation cycle.");
    }
}
