package com.example.ResumeSystemApplication.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String username;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "opt_in_for_recommendations")
    private Boolean optInForRecommendations = true;

    // Contact & Profile
    @Column(length = 30)
    private String phone;

    @Column(length = 100)
    private String location;

    @Column(length = 150)
    private String headline;

    // Candidate Education
    @Column(name = "education_level", length = 100)
    private String educationLevel;

    @Column(name = "field_of_study", length = 150)
    private String fieldOfStudy;

    @Column(length = 150)
    private String university;

    @Column(name = "graduation_year", length = 20)
    private String graduationYear;

    // Candidate Experience & Skills
    @Column(name = "years_experience")
    private Integer yearsExperience;

    @Column(name = "current_company", length = 150)
    private String currentCompany;

    @Column(name = "current_title", length = 150)
    private String currentTitle;

    @Lob
    @Column(name = "skills_summary", columnDefinition = "TEXT")
    private String skillsSummary;

    @Column(name = "portfolio_url", length = 255)
    private String portfolioUrl;

    // Recruiter Specific Verification & Corporate Profile
    @Column(name = "company_name", length = 150)
    private String companyName;

    @Column(name = "company_website", length = 255)
    private String companyWebsite;

    @Column(length = 100)
    private String designation;

    @Column(name = "hiring_domains", length = 255)
    private String hiringDomains;

    @Column(name = "verification_doc_path", length = 500)
    private String verificationDocPath;

    @Column(name = "is_verified")
    private Boolean isVerified = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.optInForRecommendations == null) {
            this.optInForRecommendations = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(role.getName()))
                .collect(Collectors.toSet());
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
