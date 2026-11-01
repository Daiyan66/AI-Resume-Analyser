package com.example.ResumeSystemApplication.config;

import com.example.ResumeSystemApplication.model.JobDescription;
import com.example.ResumeSystemApplication.model.Role;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.JobRepository;
import com.example.ResumeSystemApplication.repository.RoleRepository;
import com.example.ResumeSystemApplication.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final JobRepository jobRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            RoleRepository roleRepository,
            UserRepository userRepository,
            JobRepository jobRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.jobRepository = jobRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Checking and seeding database initial roles and users...");

        Role roleAdmin = roleRepository.findByName("ROLE_ADMIN")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_ADMIN")));
        Role roleRecruiter = roleRepository.findByName("ROLE_RECRUITER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_RECRUITER")));
        Role roleCandidate = roleRepository.findByName("ROLE_CANDIDATE")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CANDIDATE")));

        // 1. Seed Admin
        User admin = userRepository.findByUsername("admin").orElseGet(() -> {
            User u = new User();
            u.setUsername("admin");
            u.setEmail("admin@ats.com");
            u.setPassword(passwordEncoder.encode("admin123"));
            u.setFirstName("Super");
            u.setLastName("Admin");
            u.setOptInForRecommendations(false);
            u.setRoles(Set.of(roleAdmin, roleRecruiter));
            log.info("Default Admin account seeded: admin / admin123");
            return userRepository.save(u);
        });

        // 2. Seed Recruiter
        User recruiter = userRepository.findByUsername("recruiter").orElseGet(() -> {
            User u = new User();
            u.setUsername("recruiter");
            u.setEmail("recruiter@ats.com");
            u.setPassword(passwordEncoder.encode("recruiter123"));
            u.setFirstName("Sarah");
            u.setLastName("Jenkins");
            u.setOptInForRecommendations(false);
            u.setRoles(Set.of(roleRecruiter));
            log.info("Default Recruiter account seeded: recruiter / recruiter123");
            return userRepository.save(u);
        });

        // 3. Seed Candidate
        userRepository.findByUsername("candidate").orElseGet(() -> {
            User u = new User();
            u.setUsername("candidate");
            u.setEmail("candidate@ats.com");
            u.setPassword(passwordEncoder.encode("candidate123"));
            u.setFirstName("Alex");
            u.setLastName("Rivera");
            u.setOptInForRecommendations(true);
            u.setRoles(Set.of(roleCandidate));
            log.info("Default Candidate account seeded: candidate / candidate123");
            return userRepository.save(u);
        });

        // 4. Seed initial Job Postings
        if (jobRepository.count() == 0) {
            JobDescription job1 = new JobDescription();
            job1.setTitle("Senior Full-Stack Java & React Engineer");
            job1.setDescription("We are seeking an experienced Senior Full-Stack Engineer to lead the design and implementation of modern enterprise cloud applications. The ideal candidate will architect resilient RESTful microservices using Spring Boot 3, build responsive and reactive user interfaces in React with TypeScript, and optimize data persistence with MySQL and Redis. You will champion CI/CD automation, mentor junior engineers, and deliver robust software with measurable business impact.");
            job1.setSkillsRequired("Java, Spring Boot, React, TypeScript, MySQL, Docker, REST API, Git, CI/CD, Microservices");
            job1.setEducationLevel("Bachelor's or Master's in Computer Science");
            job1.setExperienceRequired(4);
            job1.setCreatedBy(recruiter);
            jobRepository.save(job1);

            JobDescription job2 = new JobDescription();
            job2.setTitle("Generative AI & LLM Systems Architect");
            job2.setDescription("Lead the development of cutting-edge GenAI workflows and multimodal cognitive architectures. In this role, you will implement retrieval-augmented generation (RAG) pipelines, evaluate frontier foundation models (Gemini, Claude, GPT-4), design structured JSON output schemas, and deploy scalable vector search infrastructure. Prior experience orchestrating LLMs within enterprise backends and evaluating hallucinations is strongly preferred.");
            job2.setSkillsRequired("Python, PyTorch, LangChain, Spring AI, Vector DB, Gemini API, RAG, Docker, Kubernetes, FastApi");
            job2.setEducationLevel("Master's or Ph.D. in Computer Science, Data Science or AI");
            job2.setExperienceRequired(3);
            job2.setCreatedBy(recruiter);
            jobRepository.save(job2);

            JobDescription job3 = new JobDescription();
            job3.setTitle("Cloud Infrastructure & DevOps Engineer");
            job3.setDescription("Join our platform reliability team to scale high-throughput cloud infrastructure. You will be responsible for Kubernetes cluster orchestration, Terraform infrastructure-as-code, automated GitHub Actions pipelines, centralized observability with Prometheus and Grafana, and rigorous zero-trust security postures across hybrid cloud environments.");
            job3.setSkillsRequired("Kubernetes, Docker, Terraform, AWS, CI/CD, Linux, Prometheus, Grafana, Python, Bash");
            job3.setEducationLevel("Bachelor's Degree in Computer Science or Information Technology");
            job3.setExperienceRequired(3);
            job3.setCreatedBy(recruiter);
            jobRepository.save(job3);

            log.info("Sample jobs seeded successfully!");
        }
    }
}
