package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.*;
import com.example.ResumeSystemApplication.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.core.io.Resource;
import org.springframework.core.io.FileSystemResource;
import java.io.File;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AdminServiceImpl implements AdminService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final ResumeRepository resumeRepository;
    private final FeedbackRepository feedbackRepository;
    private final RecruiterInvitationRepository recruiterInvitationRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AdminServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            ResumeRepository resumeRepository,
            FeedbackRepository feedbackRepository,
            RecruiterInvitationRepository recruiterInvitationRepository,
            NotificationRepository notificationRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.resumeRepository = resumeRepository;
        this.feedbackRepository = feedbackRepository;
        this.recruiterInvitationRepository = recruiterInvitationRepository;
        this.notificationRepository = notificationRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @Override
    public AdminStatsDto getAdminStats() {
        long totalUsers = userRepository.count();
        long totalCandidates = userRepository.countByRolesName("ROLE_CANDIDATE");
        long totalRecruiters = userRepository.countByRolesName("ROLE_RECRUITER");
        long totalAdmins = userRepository.countByRolesName("ROLE_ADMIN");
        long totalJobs = jobRepository.count();
        long totalApplications = applicationRepository.count();
        long totalResumes = resumeRepository.count();

        // 7-day trends
        List<Map<String, Object>> applicationTrend = new ArrayList<>();
        List<Map<String, Object>> registrationTrend = new ArrayList<>();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");

        for (int i = 6; i >= 0; i--) {
            LocalDate date = LocalDate.now().minusDays(i);
            LocalDateTime start = date.atStartOfDay();
            LocalDateTime end = date.plusDays(1).atStartOfDay();

            long appCount = applicationRepository.countByAppliedAtBetween(start, end);
            long regCount = userRepository.countByCreatedAtBetween(start, end);

            Map<String, Object> appMap = new HashMap<>();
            appMap.put("date", date.format(formatter));
            appMap.put("count", appCount);
            applicationTrend.add(appMap);

            Map<String, Object> regMap = new HashMap<>();
            regMap.put("date", date.format(formatter));
            regMap.put("count", regCount);
            registrationTrend.add(regMap);
        }

        List<Map<String, Object>> roleDist = List.of(
                Map.of("role", "Candidates", "count", totalCandidates),
                Map.of("role", "Recruiters", "count", totalRecruiters),
                Map.of("role", "Admins", "count", totalAdmins)
        );

        return AdminStatsDto.builder()
                .totalUsers(totalUsers)
                .totalCandidates(totalCandidates)
                .totalRecruiters(totalRecruiters)
                .totalAdmins(totalAdmins)
                .totalJobs(totalJobs)
                .totalApplications(totalApplications)
                .totalResumes(totalResumes)
                .applicationTrend(applicationTrend)
                .registrationTrend(registrationTrend)
                .userRoleDistribution(roleDist)
                .build();
    }

    @Override
    public List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToUserDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDto createRecruiter(CreateRecruiterDto dto) {
        if (userRepository.existsByEmail(dto.getEmail())) {
            throw new IllegalArgumentException("User with email " + dto.getEmail() + " already exists");
        }

        String username = dto.getEmail().split("@")[0] + "_" + (100 + new Random().nextInt(900));
        while (userRepository.existsByUsername(username)) {
            username = dto.getEmail().split("@")[0] + "_" + (100 + new Random().nextInt(900));
        }

        String tempPassword = "Recruit@" + UUID.randomUUID().toString().substring(0, 6);

        Role recruiterRole = roleRepository.findByName("ROLE_RECRUITER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_RECRUITER")));

        String[] names = dto.getName().trim().split("\\s+", 2);
        String firstName = names[0];
        String lastName = names.length > 1 ? names[1] : "";

        User user = new User();
        user.setUsername(username);
        user.setEmail(dto.getEmail().trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(tempPassword));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setRoles(Set.of(recruiterRole));

        User saved = userRepository.save(user);

        // Provision activation token so credentials are NOT sent in plain text (framed as an exclusive offer)
        String activationToken = UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(saved);
        prt.setToken(activationToken);
        prt.setExpiryDate(LocalDateTime.now().plusDays(7));
        passwordResetTokenRepository.save(prt);

        String activationUrl = "http://localhost:5173/reset-password?token=" + activationToken;
        emailService.sendRecruiterInvite(saved.getEmail(), dto.getName(), activationUrl);

        return mapToUserDto(saved);
    }

    @Override
    @Transactional
    public UserDto updateUser(Long id, UserDto dto) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (dto.getFirstName() != null) user.setFirstName(dto.getFirstName());
        if (dto.getLastName() != null) user.setLastName(dto.getLastName());
        if (dto.getOptInForRecommendations() != null) user.setOptInForRecommendations(dto.getOptInForRecommendations());

        if (dto.getRoles() != null && !dto.getRoles().isEmpty()) {
            Set<Role> roles = dto.getRoles().stream()
                    .map(roleName -> roleRepository.findByName(roleName)
                            .orElseGet(() -> roleRepository.save(new Role(roleName))))
                    .collect(Collectors.toSet());
            user.setRoles(roles);
        }

        return mapToUserDto(userRepository.save(user));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        boolean isRecruiter = user.getRoles().stream()
                .anyMatch(r -> "ROLE_RECRUITER".equalsIgnoreCase(r.getName()));

        if (isRecruiter) {
            // 1. Find all jobs posted by this recruiter
            List<JobDescription> recruiterJobs = jobRepository.findByCreatedByIdOrderByCreatedAtDesc(user.getId());
            for (JobDescription job : recruiterJobs) {
                // Find all applications submitted to this job
                List<Application> applications = applicationRepository.findByJobIdOrderByMatchScoreDesc(job.getId());
                for (Application app : applications) {
                    // Notify candidate if available
                    if (app.getResume() != null && app.getResume().getCandidate() != null) {
                        User candidate = app.getResume().getCandidate();
                        try {
                            Notification notif = new Notification();
                            notif.setUser(candidate);
                            notif.setTitle("Position Concluded: " + job.getTitle());
                            String orgName = user.getCompanyName() != null && !user.getCompanyName().isBlank()
                                    ? user.getCompanyName()
                                    : (user.getFirstName() != null ? user.getFirstName() + "'s Team" : "the hiring organization");
                            notif.setMessage("Update regarding your application for '" + job.getTitle() + "' at " + orgName + 
                                    ": The requisition has been retired. You couldn't crack this opening this time, but don't lose momentum — new opportunities await!");
                            notif.setType("STATUS_CHANGE");
                            notif.setLink("/candidate/applications");
                            notificationRepository.save(notif);

                            // Send email alert to candidate
                            if (candidate.getEmail() != null && !candidate.getEmail().isBlank()) {
                                emailService.sendCandidatePositionClosedAlert(candidate.getEmail(), candidate.getFirstName(), job.getTitle(), orgName);
                            }
                        } catch (Exception ex) {
                            // Continue clean cascade
                        }
                    }

                    // Delete feedback
                    List<Feedback> feedbacks = feedbackRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
                    if (!feedbacks.isEmpty()) {
                        feedbackRepository.deleteAll(feedbacks);
                    }

                    // Delete application
                    applicationRepository.delete(app);

                    // Delete batch resume if orphaned
                    if (app.getResume() != null && app.getResume().getCandidate() == null) {
                        try {
                            resumeRepository.delete(app.getResume());
                        } catch (Exception ignored) {}
                    }
                }

                // Delete job description
                jobRepository.delete(job);
            }

            // Delete recruiter invitations matching recruiter email
            try {
                recruiterInvitationRepository.deleteByEmail(user.getEmail());
            } catch (Exception ignored) {}

        } else {
            // If deleting a candidate, clean up their applications and resumes
            List<Application> candidateApps = applicationRepository.findByResumeCandidateIdOrderByAppliedAtDesc(user.getId());
            for (Application app : candidateApps) {
                List<Feedback> feedbacks = feedbackRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
                if (!feedbacks.isEmpty()) {
                    feedbackRepository.deleteAll(feedbacks);
                }
                applicationRepository.delete(app);
            }
            List<Resume> resumes = resumeRepository.findByCandidateIdOrderByUploadedAtDesc(user.getId());
            if (!resumes.isEmpty()) {
                resumeRepository.deleteAll(resumes);
            }
        }

        // Delete notifications for this user
        List<Notification> userNotifs = notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId());
        if (!userNotifs.isEmpty()) {
            notificationRepository.deleteAll(userNotifs);
        }

        // Delete password reset tokens
        try {
            passwordResetTokenRepository.deleteByUserId(user.getId());
        } catch (Exception ignored) {}

        // Delete user
        userRepository.delete(user);
    }

    @Override
    public List<RecruiterOverviewDto> getAllRecruiters() {
        List<User> recruiters = userRepository.findByRolesName("ROLE_RECRUITER");
        return recruiters.stream().map(u -> RecruiterOverviewDto.builder()
                .id(u.getId())
                .username(u.getUsername())
                .email(u.getEmail())
                .firstName(u.getFirstName())
                .lastName(u.getLastName())
                .jobsCount(jobRepository.countByCreatedById(u.getId()))
                .createdAt(u.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }

    @Override
    public List<JobDto> getJobsByRecruiter(Long recruiterId) {
        User recruiter = userRepository.findById(recruiterId)
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter not found with id: " + recruiterId));

        return jobRepository.findByCreatedByIdOrderByCreatedAtDesc(recruiter.getId()).stream()
                .map(this::mapToJobDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<CandidateDto> getCandidatesForJob(Long jobId) {
        JobDescription job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("Job not found with id: " + jobId));

        List<Application> apps = applicationRepository.findByJobIdOrderByMatchScoreDesc(job.getId());
        return apps.stream().map(this::mapToCandidateDto).collect(Collectors.toList());
    }

    @Override
    public List<UserDto> getAllCandidates() {
        List<User> candidates = userRepository.findByRolesName("ROLE_CANDIDATE");
        return candidates.stream().map(c -> {
            UserDto dto = mapToUserDto(c);
            List<Application> apps = applicationRepository.findByResumeCandidateIdOrderByAppliedAtDesc(c.getId());
            dto.setApplicationsCount((long) apps.size());
            return dto;
        }).collect(Collectors.toList());
    }

    @Override
    public List<ApplicationDto> getApplicationsByCandidate(Long candidateId) {
        User candidate = userRepository.findById(candidateId)
                .orElseThrow(() -> new ResourceNotFoundException("Candidate not found with id: " + candidateId));

        List<Application> apps = applicationRepository.findByResumeCandidateIdOrderByAppliedAtDesc(candidate.getId());
        return apps.stream().map(this::mapToApplicationDto).collect(Collectors.toList());
    }

    @Override
    public List<RecruiterRequestDto> getAllRecruiterRequests() {
        List<RecruiterInvitation> list = recruiterInvitationRepository.findAllByOrderByCreatedAtDesc();
        return list.stream().map(inv -> {
            boolean isExpired = inv.getExpiresAt() != null && inv.getExpiresAt().isBefore(LocalDateTime.now());
            String link = "http://localhost:5173/recruiter/onboard?token=" + inv.getInviteToken();
            boolean hasDoc = inv.getVerificationDocPath() != null && !inv.getVerificationDocPath().isBlank()
                    && new File(inv.getVerificationDocPath()).exists();
            return RecruiterRequestDto.builder()
                    .id(inv.getId())
                    .name(inv.getName())
                    .email(inv.getEmail())
                    .companyName(inv.getCompanyName())
                    .companyWebsite(inv.getCompanyWebsite())
                    .designation(inv.getDesignation())
                    .phone(inv.getPhone())
                    .hiringDomains(inv.getHiringDomains())
                    .verificationDocPath(inv.getVerificationDocPath())
                    .hasDocument(hasDoc)
                    .otpVerified(inv.isOtpVerified())
                    .status(inv.getStatus() != null ? inv.getStatus() : (inv.isUsed() ? "APPROVED" : "PENDING_VERIFICATION"))
                    .inviteToken(inv.getInviteToken())
                    .otp(inv.getOtp())
                    .isUsed(inv.isUsed())
                    .isExpired(isExpired)
                    .onboardingLink(link)
                    .createdAt(inv.getCreatedAt())
                    .expiresAt(inv.getExpiresAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void approveRecruiterRequest(Long id) {
        RecruiterInvitation inv = recruiterInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter request not found with id: " + id));

        String email = inv.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        Role recruiterRole = roleRepository.findByName("ROLE_RECRUITER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_RECRUITER")));

        if (user == null) {
            user = new User();
            String username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
            while (userRepository.existsByUsername(username)) {
                username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
            }
            user.setUsername(username);
            user.setEmail(email);
            // Temporary scrambled password - user will set their master password via the setup link
            user.setPassword(passwordEncoder.encode(UUID.randomUUID().toString()));
            String fullName = inv.getName() != null && !inv.getName().isBlank() ? inv.getName() : "Hiring Partner";
            String[] parts = fullName.split("\\s+", 2);
            user.setFirstName(parts[0]);
            user.setLastName(parts.length > 1 ? parts[1] : "");
            user.setPhone(inv.getPhone());
            user.setCompanyName(inv.getCompanyName());
            user.setCompanyWebsite(inv.getCompanyWebsite());
            user.setDesignation(inv.getDesignation() != null && !inv.getDesignation().isBlank() ? inv.getDesignation() : "Recruiter");
            user.setHiringDomains(inv.getHiringDomains());
            user.setVerificationDocPath(inv.getVerificationDocPath());
            user.setIsVerified(true);
            user.setRoles(Set.of(recruiterRole));
            user = userRepository.save(user);
        } else {
            user.setCompanyName(inv.getCompanyName());
            user.setCompanyWebsite(inv.getCompanyWebsite());
            user.setDesignation(inv.getDesignation());
            user.setPhone(inv.getPhone());
            user.setVerificationDocPath(inv.getVerificationDocPath());
            user.setIsVerified(true);
            user.getRoles().add(recruiterRole);
            user = userRepository.save(user);
        }

        // Generate password setup token (valid for 7 days)
        passwordResetTokenRepository.deleteByUserId(user.getId());
        String resetToken = UUID.randomUUID().toString().replace("-", "");
        PasswordResetToken prt = new PasswordResetToken();
        prt.setUser(user);
        prt.setToken(resetToken);
        prt.setExpiryDate(LocalDateTime.now().plusDays(7));
        passwordResetTokenRepository.save(prt);

        // Update invitation record
        inv.setStatus("APPROVED");
        inv.setUsed(true);
        recruiterInvitationRepository.save(inv);

        // Send email with master password setup link
        emailService.sendRecruiterApprovalAndSetupLink(inv.getEmail(), inv.getName(), inv.getCompanyName(), resetToken);

        // Notify user in-app
        Notification notif = new Notification();
        notif.setUser(user);
        notif.setTitle("Corporate Account Approved");
        notif.setMessage("Your recruiter application has been approved by Management. Welcome aboard!");
        notif.setType("STATUS_CHANGE");
        notif.setLink("/recruiter/jobs");
        notificationRepository.save(notif);
    }

    @Override
    public Resource getRecruiterRequestDocument(Long id) {
        RecruiterInvitation inv = recruiterInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter request not found with id: " + id));

        if (inv.getVerificationDocPath() == null || inv.getVerificationDocPath().isBlank()) {
            throw new ResourceNotFoundException("No formal verification document on record for this request.");
        }

        File file = new File(inv.getVerificationDocPath());
        if (!file.exists()) {
            throw new ResourceNotFoundException("Verification document file not found on disk.");
        }

        return new FileSystemResource(file);
    }

    @Override
    @Transactional
    public void resendRecruiterRequest(Long id) {
        RecruiterInvitation inv = recruiterInvitationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recruiter request not found with id: " + id));

        // Refresh token & expiration
        String newToken = UUID.randomUUID().toString().replace("-", "");
        String newOtp = String.format("%06d", new Random().nextInt(900000) + 100000);
        inv.setInviteToken(newToken);
        inv.setOtp(newOtp);
        inv.setExpiresAt(LocalDateTime.now().plusHours(48));
        inv.setUsed(false);
        recruiterInvitationRepository.save(inv);

        emailService.sendRecruiterVerificationLink(inv.getEmail(), inv.getName(), inv.getCompanyName(), newToken, newOtp);
    }

    @Override
    @Transactional
    public void deleteRecruiterRequest(Long id) {
        if (!recruiterInvitationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Recruiter request not found with id: " + id);
        }
        recruiterInvitationRepository.deleteById(id);
    }

    private ApplicationDto mapToApplicationDto(Application app) {
        JobDescription job = app.getJob();
        Resume resume = app.getResume();
        User cand = resume != null ? resume.getCandidate() : null;

        String recruiterName = "Recruiter";
        String companyName = "Enterprise Partner";

        if (job != null && job.getCreatedBy() != null) {
            User rec = job.getCreatedBy();
            recruiterName = (rec.getFirstName() != null && !rec.getFirstName().isBlank())
                    ? rec.getFirstName() + " " + (rec.getLastName() != null ? rec.getLastName() : "")
                    : rec.getUsername();
            if (rec.getCompanyName() != null && !rec.getCompanyName().isBlank()) {
                companyName = rec.getCompanyName();
            }
        }

        String candName = cand != null
                ? (cand.getFirstName() != null ? cand.getFirstName() + " " + (cand.getLastName() != null ? cand.getLastName() : "") : cand.getUsername())
                : (resume != null ? resume.getFileName() : "Candidate #" + app.getId());

        String recruiterFeedback = null;
        try {
            List<Feedback> fbs = feedbackRepository.findByApplicationIdOrderByCreatedAtDesc(app.getId());
            if (!fbs.isEmpty()) {
                recruiterFeedback = fbs.get(0).getContent();
            }
        } catch (Exception ignored) {}

        return ApplicationDto.builder()
                .id(app.getId())
                .jobId(job != null ? job.getId() : null)
                .jobTitle(job != null ? job.getTitle() : "Position")
                .companyName(companyName)
                .recruiterName(recruiterName)
                .resumeId(resume != null ? resume.getId() : null)
                .candidateId(cand != null ? cand.getId() : null)
                .fileName(resume != null ? resume.getFileName() : "resume.pdf")
                .candidateName(candName)
                .candidateEmail(cand != null ? cand.getEmail() : null)
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
                .build();
    }

    private JobDto mapToJobDto(JobDescription job) {
        long applicantsCount = applicationRepository.countByJobId(job.getId());
        String createdByName = "Recruiter";
        try {
            if (job.getCreatedBy() != null) {
                createdByName = job.getCreatedBy().getFirstName() != null && !job.getCreatedBy().getFirstName().isBlank()
                        ? job.getCreatedBy().getFirstName() + " " + (job.getCreatedBy().getLastName() != null ? job.getCreatedBy().getLastName() : "")
                        : job.getCreatedBy().getUsername();
            }
        } catch (Exception ignored) {}

        return JobDto.builder()
                .id(job.getId())
                .title(job.getTitle())
                .description(job.getDescription())
                .skillsRequired(job.getSkillsRequired())
                .educationLevel(job.getEducationLevel())
                .experienceRequired(job.getExperienceRequired())
                .createdById(job.getCreatedBy() != null ? job.getCreatedBy().getId() : null)
                .createdByName(createdByName)
                .createdAt(job.getCreatedAt())
                .applicantCount((int) applicantsCount)
                .build();
    }

    private CandidateDto mapToCandidateDto(Application app) {
        Resume resume = app.getResume();
        User candidateUser = resume != null ? resume.getCandidate() : null;

        Long candidateId = candidateUser != null ? candidateUser.getId() : null;
        String name = candidateUser != null ? (candidateUser.getFirstName() + " " + (candidateUser.getLastName() != null ? candidateUser.getLastName() : "")).trim() : null;
        if (name == null || name.isBlank()) {
            name = resume != null && resume.getFileName() != null ? resume.getFileName().replaceFirst("\\.[^.]+$", "") : "Applicant #" + app.getId();
        }

        String email = candidateUser != null ? candidateUser.getEmail() : "applicant" + app.getId() + "@example.com";
        List<String> matchedSkills = resume != null && resume.getExtractedSkills() != null
                ? Arrays.stream(resume.getExtractedSkills().split(",")).map(String::trim).filter(s -> !s.isBlank()).collect(Collectors.toList())
                : List.of();

        return CandidateDto.builder()
                .applicationId(app.getId())
                .resumeId(resume != null ? resume.getId() : null)
                .candidateId(candidateId)
                .name(name)
                .email(email)
                .fileName(resume != null ? resume.getFileName() : "resume.pdf")
                .status(app.getStatus() != null ? app.getStatus().name() : "PENDING")
                .applicationSource(app.getApplicationSource() != null ? app.getApplicationSource().name() : "INDIVIDUAL_APPLY")
                .batchId(app.getBatchId())
                .matchScore(app.getMatchScore() != null ? app.getMatchScore() : 0.0)
                .skillMatchScore(app.getSkillMatchScore() != null ? app.getSkillMatchScore() : 0.0)
                .experienceScore(app.getExperienceScore() != null ? app.getExperienceScore() : 0.0)
                .impactScore(app.getImpactScore() != null ? app.getImpactScore() : 0.0)
                .matchedSkills(matchedSkills)
                .appliedAt(app.getAppliedAt())
                .build();
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .optInForRecommendations(user.getOptInForRecommendations())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
