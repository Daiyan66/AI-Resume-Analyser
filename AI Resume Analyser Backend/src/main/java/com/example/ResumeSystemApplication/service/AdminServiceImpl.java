package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.*;
import com.example.ResumeSystemApplication.repository.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AdminServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            ResumeRepository resumeRepository,
            FeedbackRepository feedbackRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.resumeRepository = resumeRepository;
        this.feedbackRepository = feedbackRepository;
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

        // Send email with credentials
        emailService.sendRecruiterInvite(saved.getEmail(), dto.getName(), tempPassword);

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
        if (!userRepository.existsById(id)) {
            throw new ResourceNotFoundException("User not found with id: " + id);
        }
        userRepository.deleteById(id);
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
