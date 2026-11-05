package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.file.Files;
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

    @GetMapping("/recruiter-requests")
    public ResponseEntity<List<RecruiterRequestDto>> getRecruiterRequests() {
        return ResponseEntity.ok(adminService.getAllRecruiterRequests());
    }

    @PostMapping("/recruiter-requests/{id}/approve")
    public ResponseEntity<Map<String, String>> approveRecruiterRequest(@PathVariable Long id) {
        adminService.approveRecruiterRequest(id);
        return ResponseEntity.ok(Map.of("message", "Recruiter approved successfully and password setup link dispatched."));
    }

    @GetMapping("/recruiter-requests/{id}/document")
    public ResponseEntity<Resource> getRecruiterDocument(@PathVariable Long id) {
        Resource resource = adminService.getRecruiterRequestDocument(id);
        String contentType = "application/octet-stream";
        try {
            String probe = Files.probeContentType(resource.getFile().toPath());
            if (probe != null) {
                contentType = probe;
            }
        } catch (IOException ignored) {}

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + resource.getFilename() + "\"")
                .body(resource);
    }

    @PostMapping("/recruiter-requests/{id}/resend")
    public ResponseEntity<Map<String, String>> resendRecruiterRequest(@PathVariable Long id) {
        adminService.resendRecruiterRequest(id);
        return ResponseEntity.ok(Map.of("message", "Recruiter invitation resent successfully"));
    }

    @DeleteMapping("/recruiter-requests/{id}")
    public ResponseEntity<Map<String, String>> deleteRecruiterRequest(@PathVariable Long id) {
        adminService.deleteRecruiterRequest(id);
        return ResponseEntity.ok(Map.of("message", "Recruiter request deleted"));
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

    @DeleteMapping("/recruiters/{id}")
    public ResponseEntity<Map<String, String>> deleteRecruiter(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.ok(Map.of("message", "Recruiter and associated jobs removed successfully"));
    }
}
