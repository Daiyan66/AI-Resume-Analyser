package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.*;
import com.example.ResumeSystemApplication.repository.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class RecruiterServiceImpl implements RecruiterService {

    private static final Logger log = LoggerFactory.getLogger(RecruiterServiceImpl.class);

    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final ResumeRepository resumeRepository;
    private final FeedbackRepository feedbackRepository;
    private final AuthService authService;
    private final FileProcessingService fileProcessingService;
    private final AiScreeningService aiScreeningService;
    private final ProgressService progressService;
    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    // Track latest batch application IDs per job for fast result retrieval
    private final Map<Long, List<Long>> latestBatchByJob = new ConcurrentHashMap<>();

    public record StoredResumeItem(String fileName, String filePath) {}

    public RecruiterServiceImpl(
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            ResumeRepository resumeRepository,
            FeedbackRepository feedbackRepository,
            AuthService authService,
            FileProcessingService fileProcessingService,
            AiScreeningService aiScreeningService,
            ProgressService progressService,
            EmailService emailService,
            ObjectMapper objectMapper
    ) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.resumeRepository = resumeRepository;
        this.feedbackRepository = feedbackRepository;
        this.authService = authService;
        this.fileProcessingService = fileProcessingService;
        this.aiScreeningService = aiScreeningService;
        this.progressService = progressService;
        this.emailService = emailService;
        this.objectMapper = objectMapper;
    }

    @Override
    public RecruiterStatsDto getRecruiterStats() {
        User recruiter = authService.getCurrentUser();
        List<JobDescription> recruiterJobs = jobRepository.findByCreatedByIdOrderByCreatedAtDesc(recruiter.getId());
        long activeJobs = recruiterJobs.size();

        long pendingApplications = applicationRepository.countByJobCreatedByIdAndStatus(recruiter.getId(), Application.ApplicationStatus.PENDING);
        long totalCandidates = applicationRepository.countByJobCreatedById(recruiter.getId());
        long newResumesToday = resumeRepository.countByUploadedAtAfter(LocalDate.now().atStartOfDay());

        List<Map<String, Object>> applicationTrend = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");
        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();
            long count = applicationRepository.countByJobCreatedByIdAndAppliedAtBetween(recruiter.getId(), start, end);
            Map<String, Object> map = new HashMap<>();
            map.put("date", date.format(formatter));
            map.put("count", count);
            applicationTrend.add(map);
        }

        return RecruiterStatsDto.builder()
                .activeJobs(activeJobs)
                .pendingApplications(pendingApplications)
                .totalCandidates(totalCandidates)
                .newResumesToday(newResumesToday)
                .applicationTrend(applicationTrend)
                .build();
    }

    @Override
    @Transactional
    public JobDto createJob(JobFormDto formDto) {
        User recruiter = authService.getCurrentUser();

        JobDescription job = new JobDescription();
        job.setTitle(formDto.getTitle());
        job.setDescription(formDto.getDescription());
        job.setSkillsRequired(formDto.getSkillsRequired());
        job.setEducationLevel(formDto.getEducationLevel() != null ? formDto.getEducationLevel() : "Bachelor's Degree");
        job.setExperienceRequired(formDto.getExperienceRequired() != null ? formDto.getExperienceRequired() : 2);
        job.setCreatedBy(recruiter);

        JobDescription saved = jobRepository.save(job);
        return mapToJobDto(saved);
    }

    @Override
    @Transactional
    public JobDto uploadJobDescription(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String rawText = fileProcessingService.extractText(file);
        if (rawText.isBlank()) {
            throw new IllegalArgumentException("Could not extract readable text from uploaded job description document");
        }

        JobFormDto structured = aiScreeningService.parseJobDescriptionFromText(rawText);
        return createJob(structured);
    }

    @Override
    @Transactional
    public void saveAndProcessBatchResumes(Long jobId, List<MultipartFile> files) {
        List<StoredResumeItem> storedItems = new ArrayList<>();
        for (MultipartFile file : files) {
            try {
                String storedPath = fileProcessingService.storeFile(file);
                storedItems.add(new StoredResumeItem(file.getOriginalFilename(), storedPath));
            } catch (IOException e) {
                log.error("Failed to store uploaded resume during batch upload: {}", file.getOriginalFilename(), e);
            }
        }

        // Delegate to async execution with safely stored files on disk
        processStoredBatchAsync(jobId, storedItems);
    }

    @Override
    public void processBatchResumesAsync(Long jobId, List<MultipartFile> files) {
        saveAndProcessBatchResumes(jobId, files);
    }

    @Async
    @Transactional
    public void processStoredBatchAsync(Long jobId, List<StoredResumeItem> items) {
        JobDescription job = jobRepository.findById(jobId).orElse(null);
        if (job == null) {
            progressService.completeProgress(jobId, "Error: Job ID not found");
            return;
        }

        int total = items.size();
        List<Long> batchAppIds = new ArrayList<>();

        for (int i = 0; i < total; i++) {
            StoredResumeItem item = items.get(i);
            int current = i + 1;
            String originalFileName = item.fileName();
            String storedPath = item.filePath();

            try {
                // 1. Extract text from the saved file on disk
                String parsedText = fileProcessingService.extractTextFromPath(storedPath);
                if (parsedText == null || parsedText.isBlank()) {
                    parsedText = originalFileName;
                }

                // 2. AI Multimodal Evaluation
                AiEvaluationResponse aiEval = aiScreeningService.evaluateResumeAgainstJob(
                        parsedText,
                        job.getTitle(),
                        job.getDescription(),
                        job.getSkillsRequired(),
                        job.getExperienceRequired()
                );

                // 3. Save Resume
                Resume resume = new Resume();
                resume.setFileName(originalFileName);
                resume.setFilePath(storedPath);
                resume.setParsedContent(parsedText.length() > 65000 ? parsedText.substring(0, 65000) : parsedText);
                resume.setExtractedSkills(String.join(", ", aiEval.getMatchedSkills()));
                resume.setExtractedEducation(aiEval.getExtractedProfile() != null ? aiEval.getExtractedProfile().getEducation() : "Higher Education");
                resume.setExtractedExperience(aiEval.getExtractedProfile() != null ? aiEval.getExtractedProfile().getYearsExperience() : 2);
                Resume savedResume = resumeRepository.save(resume);

                // 4. Save Application
                String rawJson = objectMapper.writeValueAsString(aiEval);
                Application app = new Application();
                app.setJob(job);
                app.setResume(savedResume);
                app.setStatus(Application.ApplicationStatus.PENDING);
                app.setMatchScore(aiEval.getOverallScore());
                app.setSkillMatchScore(aiEval.getSkillMatchScore());
                app.setExperienceScore(aiEval.getExperienceScore());
                app.setImpactScore(aiEval.getImpactScore());
                app.setRawSkillGapJson(rawJson);
                Application savedApp = applicationRepository.save(app);

                batchAppIds.add(savedApp.getId());

                CandidateDto candidateDto = mapToCandidateDto(savedApp);
                progressService.sendProgress(jobId, current, total, "Evaluated " + originalFileName + " (" + (int) savedApp.getMatchScore().doubleValue() + "% match)", candidateDto);

                Thread.sleep(250);

            } catch (Exception ex) {
                log.error("Error processing stored resume {} for jobId {}", originalFileName, jobId, ex);
                progressService.sendProgress(jobId, current, total, "Failed evaluating " + originalFileName, null);
            }
        }

        latestBatchByJob.put(jobId, batchAppIds);
        progressService.completeProgress(jobId, "Completed batch processing of " + total + " resumes.");
    }

    @Override
    public List<CandidateDto> getCandidatesForJob(Long jobId) {
        List<Application> apps = applicationRepository.findByJobIdOrderByMatchScoreDesc(jobId);
        return apps.stream().map(this::mapToCandidateDto).collect(Collectors.toList());
    }

    @Override
    public List<CandidateDto> getLatestBatchResults(Long jobId) {
        List<Long> appIds = latestBatchByJob.get(jobId);
        if (appIds == null || appIds.isEmpty()) {
            return getCandidatesForJob(jobId);
        }
        return applicationRepository.findAllById(appIds).stream()
                .sorted((a, b) -> Double.compare(b.getMatchScore(), a.getMatchScore()))
                .map(this::mapToCandidateDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ApplicationDto acceptCandidate(Long applicationId) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        app.setStatus(Application.ApplicationStatus.ACCEPTED);
        Application saved = applicationRepository.save(app);

        // Send Acceptance Email
        String candidateEmail = getCandidateEmail(app);
        String candidateName = getCandidateName(app);
        if (candidateEmail != null && !candidateEmail.isBlank()) {
            emailService.sendApplicationAccepted(candidateEmail, candidateName, app.getJob().getTitle());
        }

        return mapToApplicationDto(saved);
    }

    @Override
    @Transactional
    public ApplicationDto rejectCandidate(Long applicationId, Map<String, String> payload) {
        Application app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with id: " + applicationId));

        User recruiter = authService.getCurrentUser();
        String feedbackContent = payload != null ? payload.getOrDefault("feedback", "Candidate does not meet requirements at this time.") : "Application reviewed.";

        app.setStatus(Application.ApplicationStatus.REJECTED);
        Application saved = applicationRepository.save(app);

        // Save Feedback
        Feedback feedback = new Feedback();
        feedback.setApplication(saved);
        feedback.setCreatedBy(recruiter);
        feedback.setContent(feedbackContent);
        feedbackRepository.save(feedback);

        // Parse Coaching Report for Email
        AiEvaluationResponse.SkillGapCoachingReport coachingReport = null;
        if (app.getRawSkillGapJson() != null) {
            try {
                AiEvaluationResponse eval = objectMapper.readValue(app.getRawSkillGapJson(), AiEvaluationResponse.class);
                coachingReport = eval.getCoachingReport();
            } catch (Exception ignored) {}
        }

        String candidateEmail = getCandidateEmail(app);
        String candidateName = getCandidateName(app);
        if (candidateEmail != null && !candidateEmail.isBlank()) {
            emailService.sendApplicationRejected(candidateEmail, candidateName, app.getJob().getTitle(), feedbackContent, coachingReport);
        }

        return mapToApplicationDto(saved);
    }

    @Override
    public List<JobDto> getRecruiterJobs() {
        User recruiter = authService.getCurrentUser();
        List<JobDescription> jobs;
        if (recruiter.getRoles().stream().anyMatch(r -> r.getName().equals("ROLE_ADMIN"))) {
            jobs = jobRepository.findAllByOrderByCreatedAtDesc();
        } else {
            jobs = jobRepository.findByCreatedByIdOrderByCreatedAtDesc(recruiter.getId());
        }
        return jobs.stream().map(this::mapToJobDto).collect(Collectors.toList());
    }

    private CandidateDto mapToCandidateDto(Application app) {
        String name = getCandidateName(app);
        String email = getCandidateEmail(app);

        AiEvaluationResponse eval = null;
        if (app.getRawSkillGapJson() != null) {
            try {
                eval = objectMapper.readValue(app.getRawSkillGapJson(), AiEvaluationResponse.class);
            } catch (Exception ignored) {}
        }

        return CandidateDto.builder()
                .applicationId(app.getId())
                .resumeId(app.getResume() != null ? app.getResume().getId() : null)
                .candidateId(app.getResume() != null && app.getResume().getCandidate() != null ? app.getResume().getCandidate().getId() : null)
                .name(name)
                .email(email)
                .fileName(app.getResume() != null ? app.getResume().getFileName() : "Resume.pdf")
                .status(app.getStatus() != null ? app.getStatus().name() : "PENDING")
                .matchScore(app.getMatchScore() != null ? app.getMatchScore() : 0.0)
                .skillMatchScore(app.getSkillMatchScore() != null ? app.getSkillMatchScore() : 0.0)
                .experienceScore(app.getExperienceScore() != null ? app.getExperienceScore() : 0.0)
                .impactScore(app.getImpactScore() != null ? app.getImpactScore() : 0.0)
                .appliedAt(app.getAppliedAt())
                .executiveSummary(eval != null ? eval.getExecutiveSummary() : "Evaluated by ATS.")
                .cheatDetected(eval != null && eval.isCheatDetected())
                .cheatFlags(eval != null ? eval.getCheatFlags() : Collections.emptyList())
                .matchedSkills(eval != null ? eval.getMatchedSkills() : Collections.emptyList())
                .missingSkills(eval != null ? eval.getMissingSkills() : Collections.emptyList())
                .interviewQuestions(eval != null ? eval.getInterviewQuestions() : Collections.emptyList())
                .rawSkillGapJson(app.getRawSkillGapJson())
                .build();
    }

    private String getCandidateName(Application app) {
        try {
            if (app.getResume() != null && app.getResume().getCandidate() != null && app.getResume().getCandidate().getFirstName() != null) {
                return app.getResume().getCandidate().getFirstName() + " " + (app.getResume().getCandidate().getLastName() != null ? app.getResume().getCandidate().getLastName() : "");
            }
        } catch (Exception ignored) {}

        if (app.getRawSkillGapJson() != null) {
            try {
                AiEvaluationResponse eval = objectMapper.readValue(app.getRawSkillGapJson(), AiEvaluationResponse.class);
                if (eval.getExtractedProfile() != null && eval.getExtractedProfile().getCandidateName() != null) {
                    return eval.getExtractedProfile().getCandidateName();
                }
            } catch (Exception ignored) {}
        }
        if (app.getResume() != null && app.getResume().getFileName() != null) {
            return app.getResume().getFileName().replaceFirst("[.][^.]+$", "");
        }
        return "Candidate";
    }

    private String getCandidateEmail(Application app) {
        try {
            if (app.getResume() != null && app.getResume().getCandidate() != null && app.getResume().getCandidate().getEmail() != null) {
                return app.getResume().getCandidate().getEmail();
            }
        } catch (Exception ignored) {}

        if (app.getRawSkillGapJson() != null) {
            try {
                AiEvaluationResponse eval = objectMapper.readValue(app.getRawSkillGapJson(), AiEvaluationResponse.class);
                if (eval.getExtractedProfile() != null && eval.getExtractedProfile().getEmail() != null) {
                    return eval.getExtractedProfile().getEmail();
                }
            } catch (Exception ignored) {}
        }
        return "candidate@example.com";
    }

    private JobDto mapToJobDto(JobDescription job) {
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

        return JobDto.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .skillsRequired(job.getSkillsRequired())
                .educationLevel(job.getEducationLevel())
                .experienceRequired(job.getExperienceRequired())
                .createdById(createdById)
                .createdByName(createdByName)
                .createdAt(job.getCreatedAt())
                .updatedAt(job.getUpdatedAt())
                .build();
    }

    private ApplicationDto mapToApplicationDto(Application app) {
        String jobTitle = "Job Opening";
        Long jobId = null;
        try {
            if (app.getJob() != null) {
                jobId = app.getJob().getId();
                jobTitle = app.getJob().getTitle();
            }
        } catch (Exception ignored) {}

        Long resumeId = null;
        String fileName = "Resume.pdf";
        try {
            if (app.getResume() != null) {
                resumeId = app.getResume().getId();
                fileName = app.getResume().getFileName();
            }
        } catch (Exception ignored) {}

        return ApplicationDto.builder()
                .id(app.getId())
                .jobId(jobId)
                .jobTitle(jobTitle)
                .resumeId(resumeId)
                .fileName(fileName)
                .candidateName(getCandidateName(app))
                .candidateEmail(getCandidateEmail(app))
                .status(app.getStatus() != null ? app.getStatus().name() : "PENDING")
                .matchScore(app.getMatchScore() != null ? app.getMatchScore() : 0.0)
                .skillMatchScore(app.getSkillMatchScore() != null ? app.getSkillMatchScore() : 0.0)
                .experienceScore(app.getExperienceScore() != null ? app.getExperienceScore() : 0.0)
                .impactScore(app.getImpactScore() != null ? app.getImpactScore() : 0.0)
                .rawSkillGapJson(app.getRawSkillGapJson())
                .appliedAt(app.getAppliedAt())
                .build();
    }
}
