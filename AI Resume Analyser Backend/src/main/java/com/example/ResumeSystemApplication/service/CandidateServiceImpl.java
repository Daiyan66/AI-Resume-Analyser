package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.*;
import com.example.ResumeSystemApplication.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class CandidateServiceImpl implements CandidateService {

    private static final Logger log = LoggerFactory.getLogger(CandidateServiceImpl.class);

    private final JobRepository jobRepository;
    private final ResumeRepository resumeRepository;
    private final ApplicationRepository applicationRepository;
    private final FeedbackRepository feedbackRepository;
    private final NotificationRepository notificationRepository;
    private final AuthService authService;
    private final FileProcessingService fileProcessingService;
    private final AiScreeningService aiScreeningService;
    private final ObjectMapper objectMapper;

    public CandidateServiceImpl(
            JobRepository jobRepository,
            ResumeRepository resumeRepository,
            ApplicationRepository applicationRepository,
            FeedbackRepository feedbackRepository,
            NotificationRepository notificationRepository,
            AuthService authService,
            FileProcessingService fileProcessingService,
            AiScreeningService aiScreeningService,
            ObjectMapper objectMapper
    ) {
        this.jobRepository = jobRepository;
        this.resumeRepository = resumeRepository;
        this.applicationRepository = applicationRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.authService = authService;
        this.fileProcessingService = fileProcessingService;
        this.aiScreeningService = aiScreeningService;
        this.objectMapper = objectMapper;
    }

    @Override
    public List<JobDto> getJobs(String query, String education, Integer maxExp) {
        User candidate = null;
        try {
            candidate = authService.getCurrentUser();
        } catch (Exception ignored) {}

        List<JobDescription> jobs;
        if ((query == null || query.isBlank()) && (education == null || education.isBlank()) && maxExp == null) {
            jobs = jobRepository.findAllByOrderByCreatedAtDesc();
        } else {
            jobs = jobRepository.searchJobs(query, education, maxExp);
        }

        final User currentCandidate = candidate;
        return jobs.stream().map(j -> mapToJobDto(j, currentCandidate)).collect(Collectors.toList());
    }

    @Override
    public List<JobDto> getRecommendations() {
        User candidate = authService.getCurrentUser();
        Optional<Resume> latestResume = resumeRepository.findTopByCandidateIdOrderByUploadedAtDesc(candidate.getId());

        List<JobDescription> allJobs = jobRepository.findAllByOrderByCreatedAtDesc();
        if (latestResume.isEmpty() || latestResume.get().getExtractedSkills() == null) {
            return allJobs.stream().limit(5).map(j -> mapToJobDto(j, candidate)).collect(Collectors.toList());
        }

        String candidateSkills = latestResume.get().getExtractedSkills().toLowerCase();
        List<JobDescription> matched = allJobs.stream()
                .filter(job -> {
                    if (job.getSkillsRequired() == null) return true;
                    String[] required = job.getSkillsRequired().toLowerCase().split("[,;\\s]+");
                    for (String req : required) {
                        if (!req.isBlank() && candidateSkills.contains(req)) {
                            return true;
                        }
                    }
                    return false;
                })
                .limit(5)
                .collect(Collectors.toList());

        if (matched.isEmpty()) {
            return allJobs.stream().limit(5).map(j -> mapToJobDto(j, candidate)).collect(Collectors.toList());
        }

        return matched.stream().map(j -> mapToJobDto(j, candidate)).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ApplyResponse applyForJob(Long jobId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Resume file cannot be empty");
        }

        User candidate = authService.getCurrentUser();
        JobDescription job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job posting not found with id: " + jobId));

        // 1. Check if candidate already has an active application (PENDING or ACCEPTED)
        List<Application> activeApps = applicationRepository.findActiveApplicationsForJobAndCandidate(job.getId(), candidate.getId());
        if (!activeApps.isEmpty()) {
            Application active = activeApps.get(0);
            if (active.getStatus() == Application.ApplicationStatus.ACCEPTED) {
                throw new IllegalStateException("You have already been shortlisted / accepted for this position.");
            } else {
                throw new IllegalStateException("Your application for this position is already under review.");
            }
        }

        // 2. Check 3-month rejection cooldown
        List<Application> rejectedApps = applicationRepository.findRejectedApplicationsForJobAndCandidate(job.getId(), candidate.getId());
        for (Application rej : rejectedApps) {
            if (rej.isUnderRejectionCooldown()) {
                LocalDateTime eligibleAt = rej.getEffectiveReapplyEligibleAt();
                long daysRemaining = Math.max(1L, java.time.Duration.between(LocalDateTime.now(), eligibleAt).toDays());
                DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
                String formattedDate = eligibleAt.format(formatter);
                throw new IllegalStateException(
                    "3-Month Re-application Cooldown Active: You were previously not selected for this position. " +
                    "In accordance with our hiring policy, you may re-apply after " + formattedDate + 
                    " (" + daysRemaining + " days remaining). An invitation email will be sent automatically once eligible."
                );
            }
        }

        try {
            // 1. Store file
            String storedPath = fileProcessingService.storeFile(file);

            // 2. Extract text from PDF / DOCX
            String parsedText = fileProcessingService.extractTextFromPath(storedPath);
            if (parsedText == null || parsedText.isBlank()) {
                parsedText = file.getOriginalFilename();
            }

            // 3. Multimodal LLM Evaluation (Gemini or High-Precision Local Fallback)
            AiEvaluationResponse aiEval = aiScreeningService.evaluateResumeAgainstJob(
                    parsedText,
                    job.getTitle(),
                    job.getDescription(),
                    job.getSkillsRequired(),
                    job.getExperienceRequired()
            );

            // 4. Save Resume entity
            Resume resume = new Resume();
            resume.setCandidate(candidate);
            resume.setFileName(file.getOriginalFilename());
            resume.setFilePath(storedPath);
            resume.setParsedContent(parsedText.length() > 65000 ? parsedText.substring(0, 65000) : parsedText);
            resume.setExtractedSkills(String.join(", ", aiEval.getMatchedSkills()));
            resume.setExtractedEducation(aiEval.getExtractedProfile() != null ? aiEval.getExtractedProfile().getEducation() : "Higher Education");
            resume.setExtractedExperience(aiEval.getExtractedProfile() != null ? aiEval.getExtractedProfile().getYearsExperience() : 2);
            Resume savedResume = resumeRepository.save(resume);

            // 5. Save or update Application
            String rawJson = objectMapper.writeValueAsString(aiEval);
            Optional<Application> existingApp = applicationRepository.findByJobIdAndResumeId(job.getId(), savedResume.getId());

            Application app = existingApp.orElseGet(Application::new);
            app.setJob(job);
            app.setResume(savedResume);
            app.setStatus(Application.ApplicationStatus.PENDING);
            app.setApplicationSource(Application.ApplicationSource.INDIVIDUAL_APPLY);
            app.setBatchId(null);
            app.setMatchScore(aiEval.getOverallScore());
            app.setSkillMatchScore(aiEval.getSkillMatchScore());
            app.setExperienceScore(aiEval.getExperienceScore());
            app.setImpactScore(aiEval.getImpactScore());
            app.setRawSkillGapJson(rawJson);

            Application savedApp = applicationRepository.save(app);

            // Notify Recruiter of new candidate application
            if (job.getCreatedBy() != null) {
                try {
                    Notification notif = new Notification();
                    notif.setUser(job.getCreatedBy());
                    notif.setTitle("New Candidate Application");
                    String candName = (candidate.getFirstName() != null && !candidate.getFirstName().isBlank())
                            ? candidate.getFirstName() + " " + (candidate.getLastName() != null ? candidate.getLastName() : "")
                            : candidate.getUsername();
                    notif.setMessage(candName + " applied for " + job.getTitle() + " (Score: " + Math.round(savedApp.getMatchScore()) + "%)");
                    notif.setType("NEW_APPLICATION");
                    notif.setLink("/recruiter/candidates?jobId=" + job.getId());
                    notificationRepository.save(notif);
                } catch (Exception ex) {
                    log.warn("Failed to notify recruiter of new application", ex);
                }
            }

            return ApplyResponse.builder()
                    .applicationId(savedApp.getId())
                    .jobId(job.getId())
                    .jobTitle(job.getTitle())
                    .status(savedApp.getStatus().name())
                    .matchScore(savedApp.getMatchScore())
                    .skillMatchScore(savedApp.getSkillMatchScore())
                    .experienceScore(savedApp.getExperienceScore())
                    .impactScore(savedApp.getImpactScore())
                    .executiveSummary(aiEval.getExecutiveSummary())
                    .message("Application submitted successfully and evaluated by ATS AI.")
                    .build();

        } catch (IOException e) {
            log.error("Failed to store or read candidate resume", e);
            throw new IllegalArgumentException("Failed to process uploaded resume file: " + e.getMessage());
        }
    }

    @Override
    public List<ApplicationDto> getCandidateApplications() {
        User candidate = authService.getCurrentUser();
        List<Application> apps = applicationRepository.findByResumeCandidateIdOrderByAppliedAtDesc(candidate.getId());
        return apps.stream().map(this::mapToApplicationDto).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getLatestApplicationId() {
        User candidate = authService.getCurrentUser();
        Optional<Application> latest = applicationRepository.findTopByResumeCandidateIdOrderByAppliedAtDesc(candidate.getId());
        Map<String, Object> map = new HashMap<>();
        map.put("applicationId", latest.map(Application::getId).orElse(null));
        return map;
    }

    @Override
    public SkillGapAnalysisDto getSkillGapAnalysis(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        AiEvaluationResponse aiEval = null;
        if (app.getRawSkillGapJson() != null && !app.getRawSkillGapJson().isBlank()) {
            try {
                aiEval = objectMapper.readValue(app.getRawSkillGapJson(), AiEvaluationResponse.class);
            } catch (Exception e) {
                log.warn("Failed to parse rawSkillGapJson for application {}", applicationId, e);
            }
        }

        if (aiEval == null) {
            aiEval = aiScreeningService.evaluateLocally(
                    app.getResume().getParsedContent() != null ? app.getResume().getParsedContent() : "",
                    app.getJob().getTitle(),
                    app.getJob().getDescription(),
                    app.getJob().getSkillsRequired(),
                    app.getJob().getExperienceRequired()
            );
        }

        String candidateName = "Candidate";
        try {
            if (app.getResume() != null && app.getResume().getCandidate() != null && app.getResume().getCandidate().getFirstName() != null) {
                candidateName = app.getResume().getCandidate().getFirstName() + " " + (app.getResume().getCandidate().getLastName() != null ? app.getResume().getCandidate().getLastName() : "");
            } else if (aiEval.getExtractedProfile() != null && aiEval.getExtractedProfile().getCandidateName() != null) {
                candidateName = aiEval.getExtractedProfile().getCandidateName();
            }
        } catch (Exception ignored) {}

        String jobTitle = "Job Opening";
        Long jobId = null;
        try {
            if (app.getJob() != null) {
                jobId = app.getJob().getId();
                jobTitle = app.getJob().getTitle();
            }
        } catch (Exception ignored) {}

        String recruiterFeedback = null;
        try {
            List<Feedback> fbs = feedbackRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
            if (!fbs.isEmpty()) {
                recruiterFeedback = fbs.get(0).getContent();
            }
        } catch (Exception ignored) {}

        Long candidateId = null;
        try {
            if (app.getResume() != null && app.getResume().getCandidate() != null) {
                candidateId = app.getResume().getCandidate().getId();
            }
        } catch (Exception ignored) {}

        return SkillGapAnalysisDto.builder()
                .applicationId(app.getId())
                .jobId(jobId)
                .jobTitle(jobTitle)
                .candidateId(candidateId)
                .candidateName(candidateName.trim())
                .recruiterFeedback(recruiterFeedback)
                .matchScore(app.getMatchScore() != null ? app.getMatchScore() : 0.0)
                .skillMatchScore(app.getSkillMatchScore() != null ? app.getSkillMatchScore() : 0.0)
                .experienceScore(app.getExperienceScore() != null ? app.getExperienceScore() : 0.0)
                .impactScore(app.getImpactScore() != null ? app.getImpactScore() : 0.0)
                .domainScore(aiEval.getDomainScore())
                .matchedSkills(aiEval.getMatchedSkills() != null ? aiEval.getMatchedSkills() : Collections.emptyList())
                .missingSkills(aiEval.getMissingSkills() != null ? aiEval.getMissingSkills() : Collections.emptyList())
                .bonusSkills(aiEval.getBonusSkills() != null ? aiEval.getBonusSkills() : Collections.emptyList())
                .executiveSummary(aiEval.getExecutiveSummary() != null ? aiEval.getExecutiveSummary() : "Comprehensive ATS analysis compiled.")
                .cheatDetected(aiEval.isCheatDetected())
                .cheatFlags(aiEval.getCheatFlags() != null ? aiEval.getCheatFlags() : Collections.emptyList())
                .interviewQuestions(aiEval.getInterviewQuestions() != null ? aiEval.getInterviewQuestions() : Collections.emptyList())
                .coachingReport(aiEval.getCoachingReport())
                .build();
    }

    @Override
    public List<NotificationDto> getNotifications() {
        User candidate = authService.getCurrentUser();
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(candidate.getId()).stream()
                .map(n -> NotificationDto.builder()
                        .id(n.getId())
                        .title(n.getTitle())
                        .message(n.getMessage())
                        .type(n.getType())
                        .link(n.getLink())
                        .isRead(n.isRead())
                        .createdAt(n.getCreatedAt())
                        .build()
                ).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void markNotificationAsRead(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
    }

    @Override
    @Transactional
    public void markAllNotificationsAsRead() {
        User candidate = authService.getCurrentUser();
        notificationRepository.markAllAsReadForUser(candidate.getId());
    }

    private JobDto mapToJobDto(JobDescription job, User candidate) {
        String createdByName = "ATS Recruiter";
        Long createdById = null;
        try {
            if (job.getCreatedBy() != null) {
                createdById = job.getCreatedBy().getId();
                String fn = job.getCreatedBy().getFirstName() != null ? job.getCreatedBy().getFirstName() : "";
                String ln = job.getCreatedBy().getLastName() != null ? job.getCreatedBy().getLastName() : "";
                createdByName = (fn + " " + ln).trim();
                if (createdByName.isBlank()) {
                    createdByName = job.getCreatedBy().getUsername();
                }
            }
        } catch (Exception ignored) {}

        String appliedStatus = null;
        Boolean canApply = true;
        LocalDateTime reapplyEligibleAt = null;
        Long daysUntilReapply = null;
        String cooldownReason = null;

        if (candidate != null) {
            // Check active applications (PENDING / ACCEPTED)
            List<Application> activeApps = applicationRepository.findActiveApplicationsForJobAndCandidate(job.getId(), candidate.getId());
            if (!activeApps.isEmpty()) {
                Application active = activeApps.get(0);
                appliedStatus = active.getStatus().name();
                canApply = false;
                cooldownReason = active.getStatus() == Application.ApplicationStatus.ACCEPTED
                        ? "You have already been shortlisted for this position."
                        : "Your application is currently under review.";
            } else {
                // Check rejected applications
                List<Application> rejectedApps = applicationRepository.findRejectedApplicationsForJobAndCandidate(job.getId(), candidate.getId());
                if (!rejectedApps.isEmpty()) {
                    Application latestRejected = rejectedApps.get(0);
                    if (latestRejected.isUnderRejectionCooldown()) {
                        appliedStatus = "REJECTED";
                        canApply = false;
                        reapplyEligibleAt = latestRejected.getEffectiveReapplyEligibleAt();
                        daysUntilReapply = Math.max(1L, java.time.Duration.between(LocalDateTime.now(), reapplyEligibleAt).toDays());
                        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy");
                        cooldownReason = "3-month cooldown active until " + reapplyEligibleAt.format(formatter) + " (" + daysUntilReapply + " days remaining)";
                    } else {
                        appliedStatus = "REJECTED_COOLDOWN_EXPIRED";
                        canApply = true;
                        daysUntilReapply = 0L;
                        cooldownReason = "3-month cooldown elapsed. You are eligible to re-apply with an updated resume!";
                    }
                }
            }
        }

        return JobDto.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .skillsRequired(job.getSkillsRequired())
                .educationLevel(job.getEducationLevel())
                .experienceRequired(job.getExperienceRequired())
                .createdById(createdById)
                .createdByName(createdByName)
                .appliedStatus(appliedStatus)
                .canApply(canApply)
                .reapplyEligibleAt(reapplyEligibleAt)
                .daysUntilReapply(daysUntilReapply)
                .cooldownReason(cooldownReason)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }

    private ApplicationDto mapToApplicationDto(Application app) {
        String candidateName = "Candidate";
        String candidateEmail = "N/A";
        try {
            if (app.getResume() != null && app.getResume().getCandidate() != null) {
                candidateName = app.getResume().getCandidate().getFirstName() + " " + (app.getResume().getCandidate().getLastName() != null ? app.getResume().getCandidate().getLastName() : "");
                candidateEmail = app.getResume().getCandidate().getEmail();
            }
        } catch (Exception ignored) {}

        String jobTitle = "Job Opening";
        Long jobId = null;
        try {
            if (app.getJob() != null) {
                jobId = app.getJob().getId();
                jobTitle = app.getJob().getTitle();
            }
        } catch (Exception ignored) {}

        Long resumeId = null;
        Long candidateId = null;
        String fileName = "Resume.pdf";
        try {
            if (app.getResume() != null) {
                resumeId = app.getResume().getId();
                fileName = app.getResume().getFileName();
                if (app.getResume().getCandidate() != null) {
                    candidateId = app.getResume().getCandidate().getId();
                }
            }
        } catch (Exception ignored) {}

        String recruiterFeedback = null;
        try {
            List<Feedback> fbs = feedbackRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
            if (!fbs.isEmpty()) {
                recruiterFeedback = fbs.get(0).getContent();
            }
        } catch (Exception ignored) {}

        LocalDateTime eligibleAt = app.getEffectiveReapplyEligibleAt();
        boolean underCooldown = app.isUnderRejectionCooldown();
        Long daysRemaining = null;
        if (eligibleAt != null && underCooldown) {
            daysRemaining = Math.max(1L, java.time.Duration.between(LocalDateTime.now(), eligibleAt).toDays());
        }

        return ApplicationDto.builder()
                .id(app.getId())
                .jobId(jobId)
                .jobTitle(jobTitle)
                .resumeId(resumeId)
                .candidateId(candidateId)
                .fileName(fileName)
                .candidateName(candidateName.trim())
                .candidateEmail(candidateEmail)
                .status(app.getStatus() != null ? app.getStatus().name() : "PENDING")
                .applicationSource(app.getApplicationSource() != null ? app.getApplicationSource().name() : "INDIVIDUAL_APPLY")
                .batchId(app.getBatchId())
                .recruiterFeedback(recruiterFeedback)
                .matchScore(app.getMatchScore() != null ? app.getMatchScore() : 0.0)
                .skillMatchScore(app.getSkillMatchScore() != null ? app.getSkillMatchScore() : 0.0)
                .experienceScore(app.getExperienceScore() != null ? app.getExperienceScore() : 0.0)
                .impactScore(app.getImpactScore() != null ? app.getImpactScore() : 0.0)
                .rawSkillGapJson(app.getRawSkillGapJson())
                .appliedAt(app.getAppliedAt())
                .rejectedAt(app.getRejectedAt())
                .reapplyEligibleAt(eligibleAt)
                .canReapply(app.getStatus() == Application.ApplicationStatus.REJECTED && !underCooldown)
                .daysUntilReapply(daysRemaining)
                .build();
    }
}
