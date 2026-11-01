package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AdminStatsDto;
import com.example.ResumeSystemApplication.dto.CreateRecruiterDto;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.Role;
import com.example.ResumeSystemApplication.model.User;
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
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AdminServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            JobRepository jobRepository,
            ApplicationRepository applicationRepository,
            ResumeRepository resumeRepository,
            PasswordEncoder passwordEncoder,
            EmailService emailService
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.resumeRepository = resumeRepository;
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
