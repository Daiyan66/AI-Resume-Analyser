package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.service.CandidateService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/candidate")
@PreAuthorize("hasRole('CANDIDATE')")
public class CandidateController {

    private final CandidateService candidateService;

    public CandidateController(CandidateService candidateService) {
        this.candidateService = candidateService;
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<JobDto>> getJobs(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String education,
            @RequestParam(required = false) Integer maxExp
    ) {
        return ResponseEntity.ok(candidateService.getJobs(query, education, maxExp));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<JobDto>> getRecommendations() {
        return ResponseEntity.ok(candidateService.getRecommendations());
    }

    @PostMapping(value = "/apply", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApplyResponse> applyForJob(
            @RequestParam("jobId") Long jobId,
            @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(candidateService.applyForJob(jobId, file));
    }

    @GetMapping("/applications")
    public ResponseEntity<List<ApplicationDto>> getApplications() {
        return ResponseEntity.ok(candidateService.getCandidateApplications());
    }

    @GetMapping("/analysis/latest")
    public ResponseEntity<Map<String, Object>> getLatestApplicationId() {
        return ResponseEntity.ok(candidateService.getLatestApplicationId());
    }

    @GetMapping("/analysis/{appId}")
    public ResponseEntity<SkillGapAnalysisDto> getSkillGapAnalysis(@PathVariable Long appId) {
        return ResponseEntity.ok(candidateService.getSkillGapAnalysis(appId));
    }

    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationDto>> getNotifications() {
        return ResponseEntity.ok(candidateService.getNotifications());
    }

    @PutMapping("/notifications/{id}/read")
    public ResponseEntity<Map<String, String>> markNotificationAsRead(@PathVariable Long id) {
        candidateService.markNotificationAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Notification marked as read"));
    }

    @PutMapping("/notifications/read-all")
    public ResponseEntity<Map<String, String>> markAllNotificationsAsRead() {
        candidateService.markAllNotificationsAsRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }
}
