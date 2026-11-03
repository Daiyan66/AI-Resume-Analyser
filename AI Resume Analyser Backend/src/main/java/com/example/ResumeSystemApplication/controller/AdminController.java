package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        return ResponseEntity.ok(adminService.getAdminStats());
    }

    @GetMapping("/users")
    public ResponseEntity<List<UserDto>> getUsers() {
        return ResponseEntity.ok(adminService.getAllUsers());
    }

    @GetMapping("/recruiters")
    public ResponseEntity<List<RecruiterOverviewDto>> getRecruiters() {
        return ResponseEntity.ok(adminService.getAllRecruiters());
    }

    @GetMapping("/recruiters/{recruiterId}/jobs")
    public ResponseEntity<List<JobDto>> getJobsByRecruiter(@PathVariable Long recruiterId) {
        return ResponseEntity.ok(adminService.getJobsByRecruiter(recruiterId));
    }

    @GetMapping("/jobs/{jobId}/candidates")
    public ResponseEntity<List<CandidateDto>> getCandidatesForJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(adminService.getCandidatesForJob(jobId));
    }

    @GetMapping("/candidates")
    public ResponseEntity<List<UserDto>> getCandidates() {
        return ResponseEntity.ok(adminService.getAllCandidates());
    }

    @GetMapping("/candidates/{candidateId}/applications")
    public ResponseEntity<List<ApplicationDto>> getApplicationsByCandidate(@PathVariable Long candidateId) {
        return ResponseEntity.ok(adminService.getApplicationsByCandidate(candidateId));
    }

    @PostMapping("/add-recruiter")
    public ResponseEntity<UserDto> addRecruiter(@Valid @RequestBody CreateRecruiterDto dto) {
        return ResponseEntity.ok(adminService.createRecruiter(dto));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<UserDto> updateUser(@PathVariable Long id, @RequestBody UserDto dto) {
        return ResponseEntity.ok(adminService.updateUser(id, dto));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, String>> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }
}
