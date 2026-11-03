package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.config.JwtService;
import com.example.ResumeSystemApplication.dto.AuthRequest;
import com.example.ResumeSystemApplication.dto.AuthResponse;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.RecruiterInvitation;
import com.example.ResumeSystemApplication.model.Resume;
import com.example.ResumeSystemApplication.model.Role;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.RecruiterInvitationRepository;
import com.example.ResumeSystemApplication.repository.ResumeRepository;
import com.example.ResumeSystemApplication.repository.RoleRepository;
import com.example.ResumeSystemApplication.model.Notification;
import com.example.ResumeSystemApplication.repository.NotificationRepository;
import com.example.ResumeSystemApplication.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceImpl.class);

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final RecruiterInvitationRepository recruiterInvitationRepository;
    private final EmailService emailService;
    private final ResumeRepository resumeRepository;
    private final FileProcessingService fileProcessingService;
    private final NotificationRepository notificationRepository;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            RecruiterInvitationRepository recruiterInvitationRepository,
            EmailService emailService,
            ResumeRepository resumeRepository,
            FileProcessingService fileProcessingService,
            NotificationRepository notificationRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.recruiterInvitationRepository = recruiterInvitationRepository;
        this.emailService = emailService;
        this.resumeRepository = resumeRepository;
        this.fileProcessingService = fileProcessingService;
        this.notificationRepository = notificationRepository;
    }

    @Override
    @Transactional
    public AuthResponse register(Map<String, String> request) {
        return registerCandidateWithTunnel(null, request);
    }

    @Override
    @Transactional
    public AuthResponse registerCandidateWithTunnel(MultipartFile file, Map<String, String> data) {
        String username = data.get("username");
        String email = data.get("email");
        String password = data.get("password");
        String firstName = data.get("firstName");
        String lastName = data.get("lastName");

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (username == null || username.isBlank()) {
            username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
        }
        while (userRepository.existsByUsername(username)) {
            username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
        }
        if (userRepository.existsByEmail(email.trim().toLowerCase())) {
            throw new IllegalArgumentException("Email is already registered. Please sign in.");
        }

        Role candidateRole = roleRepository.findByName("ROLE_CANDIDATE")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CANDIDATE")));

        User user = new User();
        user.setUsername(username.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setPhone(data.get("phone"));
        user.setLocation(data.get("location"));
        user.setHeadline(data.get("headline"));
        user.setEducationLevel(data.get("educationLevel"));
        user.setFieldOfStudy(data.get("fieldOfStudy"));
        user.setUniversity(data.get("university"));
        user.setGraduationYear(data.get("graduationYear"));
        
        try {
            if (data.get("yearsExperience") != null && !data.get("yearsExperience").isBlank()) {
                user.setYearsExperience(Integer.parseInt(data.get("yearsExperience").trim()));
            }
        } catch (Exception ignored) {}

        user.setCurrentCompany(data.get("currentCompany"));
        user.setCurrentTitle(data.get("currentTitle"));
        user.setSkillsSummary(data.get("skillsSummary"));
        user.setPortfolioUrl(data.get("portfolioUrl"));
        user.setOptInForRecommendations(!"false".equalsIgnoreCase(data.get("optInForRecommendations")));
        user.setRoles(Set.of(candidateRole));

        User savedUser = userRepository.save(user);

        // If candidate uploaded an initial resume during registration tunnel
        if (file != null && !file.isEmpty()) {
            try {
                String storedPath = fileProcessingService.storeFile(file);
                String extractedText = fileProcessingService.extractTextFromPath(storedPath);

                Resume resume = new Resume();
                resume.setCandidate(savedUser);
                resume.setFileName(file.getOriginalFilename());
                resume.setFilePath(storedPath);
                resume.setParsedContent(extractedText != null ? extractedText : file.getOriginalFilename());
                resume.setExtractedSkills(data.get("skillsSummary") != null ? data.get("skillsSummary") : "General Skills");
                resume.setExtractedEducation(data.get("educationLevel") != null ? data.get("educationLevel") : "Degree");
                resume.setExtractedExperience(savedUser.getYearsExperience() != null ? savedUser.getYearsExperience() : 0);
                resumeRepository.save(resume);
            } catch (Exception e) {
                log.warn("Could not save initial resume file during candidate tunnel registration", e);
            }
        } else if (data.get("skillsSummary") != null && !data.get("skillsSummary").isBlank()) {
            // Baseline Resume record for recommendation queries
            Resume resume = new Resume();
            resume.setCandidate(savedUser);
            resume.setFileName("Profile_Resume.txt");
            resume.setFilePath("profile://generated");
            resume.setParsedContent(data.get("skillsSummary"));
            resume.setExtractedSkills(data.get("skillsSummary"));
            resume.setExtractedEducation(data.get("educationLevel") != null ? data.get("educationLevel") : "Degree");
            resume.setExtractedExperience(savedUser.getYearsExperience() != null ? savedUser.getYearsExperience() : 0);
            resumeRepository.save(resume);
        }

        String token = jwtService.generateToken(savedUser);

        // Notify Admins of new candidate registration
        try {
            List<User> admins = userRepository.findByRolesName("ROLE_ADMIN");
            for (User admin : admins) {
                Notification notif = new Notification();
                notif.setUser(admin);
                notif.setTitle("New Candidate Registration");
                String candName = (savedUser.getFirstName() != null && !savedUser.getFirstName().isBlank())
                        ? savedUser.getFirstName() + " " + (savedUser.getLastName() != null ? savedUser.getLastName() : "")
                        : savedUser.getUsername();
                notif.setMessage(candName + " registered as a candidate (" + savedUser.getEmail() + ")");
                notif.setType("CANDIDATE_REGISTRATION");
                notif.setLink("/admin/candidates");
                notificationRepository.save(notif);
            }
        } catch (Exception ex) {
            log.warn("Failed to notify admins of candidate registration", ex);
        }

        return AuthResponse.builder()
                .token(token)
                .username(savedUser.getUsername())
                .role("ROLE_CANDIDATE")
                .firstName(savedUser.getFirstName())
                .lastName(savedUser.getLastName())
                .email(savedUser.getEmail())
                .build();
    }

    @Override
    @Transactional
    public Map<String, Object> requestRecruiterAccess(Map<String, String> request) {
        String email = request.get("email");
        String name = request.get("name");
        String companyName = request.get("companyName");

        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Corporate email address is required");
        }

        email = email.trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with email " + email + " already exists. Please log in directly.");
        }

        String inviteToken = UUID.randomUUID().toString().replace("-", "");
        String otp = String.format("%06d", new Random().nextInt(900000) + 100000);

        RecruiterInvitation invitation = new RecruiterInvitation();
        invitation.setEmail(email);
        invitation.setName(name != null && !name.isBlank() ? name : "Hiring Manager");
        invitation.setCompanyName(companyName != null && !companyName.isBlank() ? companyName : "Enterprise Partner");
        invitation.setInviteToken(inviteToken);
        invitation.setOtp(otp);
        invitation.setUsed(false);
        recruiterInvitationRepository.save(invitation);

        // Send automated verification email with link & OTP
        emailService.sendRecruiterVerificationLink(email, name, inviteToken, otp);

        // Notify Admins of recruiter verification request
        try {
            List<User> admins = userRepository.findByRolesName("ROLE_ADMIN");
            for (User admin : admins) {
                Notification notif = new Notification();
                notif.setUser(admin);
                notif.setTitle("Recruiter Verification Requested");
                notif.setMessage(invitation.getName() + " (" + invitation.getCompanyName() + ") requested recruiter access (" + email + ")");
                notif.setType("RECRUITER_REQUEST");
                notif.setLink("/admin/recruiters");
                notificationRepository.save(notif);
            }
        } catch (Exception ex) {
            log.warn("Failed to notify admins of recruiter access request", ex);
        }

        log.info(">>> RECRUITER VERIFICATION LINK GENERATED FOR [{}]: Token={}, OTP={}", email, inviteToken, otp);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Recruiter invitation link and 6-digit verification OTP have been dispatched to " + email);
        response.put("email", email);
        response.put("inviteToken", inviteToken);
        response.put("otp", otp);
        return response;
    }

    @Override
    public Map<String, Object> verifyRecruiterToken(String token) {
        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Verification token is required");
        }

        RecruiterInvitation invitation = recruiterInvitationRepository.findByInviteTokenAndIsUsedFalse(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired recruiter invitation link. Please request a new invite."));

        if (invitation.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("This invitation link has expired. Please request a new invite from the landing page.");
        }

        Map<String, Object> res = new HashMap<>();
        res.put("valid", true);
        res.put("email", invitation.getEmail());
        res.put("name", invitation.getName());
        res.put("companyName", invitation.getCompanyName());
        return res;
    }

    @Override
    @Transactional
    public AuthResponse registerRecruiterWithTunnel(MultipartFile verificationDocument, Map<String, String> data) {
        String token = data.get("token");
        String enteredOtp = data.get("otp");
        String username = data.get("username");
        String password = data.get("password");
        String firstName = data.get("firstName");
        String lastName = data.get("lastName");
        String companyName = data.get("companyName");
        String companyWebsite = data.get("companyWebsite");
        String designation = data.get("designation");
        String hiringDomains = data.get("hiringDomains");
        String phone = data.get("phone");

        if (token == null || token.isBlank()) {
            throw new IllegalArgumentException("Verification token is required");
        }
        if (enteredOtp == null || enteredOtp.isBlank()) {
            throw new IllegalArgumentException("OTP code is required");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }

        RecruiterInvitation invitation = recruiterInvitationRepository.findByInviteTokenAndIsUsedFalse(token.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired recruiter invitation link."));

        if (!invitation.getOtp().trim().equals(enteredOtp.trim())) {
            throw new IllegalArgumentException("Invalid OTP code. Please enter the exact 6-digit code sent to your email.");
        }

        String email = invitation.getEmail();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with email " + email + " is already registered.");
        }

        if (username == null || username.isBlank()) {
            username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
        }
        while (userRepository.existsByUsername(username)) {
            username = email.split("@")[0].replaceAll("[^a-zA-Z0-9_]", "") + "_" + (100 + new Random().nextInt(900));
        }

        // Store formal verification document
        String docPath = null;
        if (verificationDocument != null && !verificationDocument.isEmpty()) {
            try {
                docPath = fileProcessingService.storeFile(verificationDocument);
            } catch (Exception e) {
                log.warn("Could not store formal verification document", e);
            }
        }

        Role recruiterRole = roleRepository.findByName("ROLE_RECRUITER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_RECRUITER")));

        User user = new User();
        user.setUsername(username.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName != null && !firstName.isBlank() ? firstName : invitation.getName());
        user.setLastName(lastName);
        user.setPhone(phone);
        user.setCompanyName(companyName != null && !companyName.isBlank() ? companyName : invitation.getCompanyName());
        user.setCompanyWebsite(companyWebsite);
        user.setDesignation(designation != null && !designation.isBlank() ? designation : "Recruiter");
        user.setHiringDomains(hiringDomains);
        user.setVerificationDocPath(docPath);
        user.setIsVerified(docPath != null);
        user.setRoles(Set.of(recruiterRole));

        User saved = userRepository.save(user);

        // Mark invitation as used
        invitation.setUsed(true);
        recruiterInvitationRepository.save(invitation);

        String jwt = jwtService.generateToken(saved);

        // Notify Admins of completed recruiter onboarding
        try {
            List<User> admins = userRepository.findByRolesName("ROLE_ADMIN");
            for (User admin : admins) {
                Notification notif = new Notification();
                notif.setUser(admin);
                notif.setTitle("Recruiter Onboarded");
                notif.setMessage(saved.getFirstName() + " (" + saved.getCompanyName() + ") completed recruiter onboarding (" + saved.getEmail() + ")");
                notif.setType("RECRUITER_ONBOARDED");
                notif.setLink("/admin/recruiters");
                notificationRepository.save(notif);
            }
        } catch (Exception ex) {
            log.warn("Failed to notify admins of recruiter onboarding", ex);
        }

        return AuthResponse.builder()
                .token(jwt)
                .username(saved.getUsername())
                .role("ROLE_RECRUITER")
                .firstName(saved.getFirstName())
                .lastName(saved.getLastName())
                .email(saved.getEmail())
                .build();
    }

    @Override
    public AuthResponse login(AuthRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            User user = (User) authentication.getPrincipal();
            String token = jwtService.generateToken(user);

            String primaryRole = user.getRoles().stream()
                    .map(Role::getName)
                    .filter(r -> r.equals("ROLE_ADMIN"))
                    .findFirst()
                    .orElseGet(() -> user.getRoles().stream()
                            .map(Role::getName)
                            .filter(r -> r.equals("ROLE_RECRUITER"))
                            .findFirst()
                            .orElse("ROLE_CANDIDATE"));

            return AuthResponse.builder()
                    .token(token)
                    .username(user.getUsername())
                    .role(primaryRole)
                    .firstName(user.getFirstName())
                    .lastName(user.getLastName())
                    .email(user.getEmail())
                    .build();
        } catch (Exception ex) {
            throw new BadCredentialsException("Invalid username or password");
        }
    }

    @Override
    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResourceNotFoundException("No authenticated user found in security context");
        }
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
    }

    @Override
    public UserDto getCurrentUserDto() {
        User user = getCurrentUser();
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .optInForRecommendations(user.getOptInForRecommendations())
                .phone(user.getPhone())
                .location(user.getLocation())
                .headline(user.getHeadline())
                .educationLevel(user.getEducationLevel())
                .fieldOfStudy(user.getFieldOfStudy())
                .university(user.getUniversity())
                .graduationYear(user.getGraduationYear())
                .yearsExperience(user.getYearsExperience())
                .currentCompany(user.getCurrentCompany())
                .currentTitle(user.getCurrentTitle())
                .skillsSummary(user.getSkillsSummary())
                .portfolioUrl(user.getPortfolioUrl())
                .companyName(user.getCompanyName())
                .companyWebsite(user.getCompanyWebsite())
                .designation(user.getDesignation())
                .hiringDomains(user.getHiringDomains())
                .isVerified(user.getIsVerified())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .build();
    }
}
