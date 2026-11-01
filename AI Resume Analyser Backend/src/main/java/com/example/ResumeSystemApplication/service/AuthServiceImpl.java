package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.config.JwtService;
import com.example.ResumeSystemApplication.dto.AuthRequest;
import com.example.ResumeSystemApplication.dto.AuthResponse;
import com.example.ResumeSystemApplication.dto.UserDto;
import com.example.ResumeSystemApplication.exception.ResourceNotFoundException;
import com.example.ResumeSystemApplication.model.Role;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.RoleRepository;
import com.example.ResumeSystemApplication.repository.UserRepository;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthServiceImpl(
            UserRepository userRepository,
            RoleRepository roleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    @Override
    @Transactional
    public AuthResponse register(Map<String, String> request) {
        String username = request.get("username");
        String email = request.get("email");
        String password = request.get("password");
        String firstName = request.get("firstName");
        String lastName = request.get("lastName");

        if (username == null || username.isBlank()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (email == null || email.isBlank()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (password == null || password.isBlank()) {
            throw new IllegalArgumentException("Password is required");
        }
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username is already taken");
        }
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email is already registered");
        }

        Role candidateRole = roleRepository.findByName("ROLE_CANDIDATE")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CANDIDATE")));

        User user = new User();
        user.setUsername(username.trim());
        user.setEmail(email.trim().toLowerCase());
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setOptInForRecommendations(true);
        user.setRoles(Set.of(candidateRole));

        User savedUser = userRepository.save(user);

        String token = jwtService.generateToken(savedUser);
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
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .roles(user.getRoles().stream().map(Role::getName).collect(Collectors.toSet()))
                .build();
    }
}
