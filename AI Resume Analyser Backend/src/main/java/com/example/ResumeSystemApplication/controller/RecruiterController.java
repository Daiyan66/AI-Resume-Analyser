package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.dto.*;
import com.example.ResumeSystemApplication.service.ProgressService;
import com.example.ResumeSystemApplication.service.RecruiterService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recruiter")
public class RecruiterController {

    private final RecruiterService recruiterService;
    private final ProgressService progressService;

    public RecruiterController(RecruiterService recruiterService, ProgressService progressService) {
        this.recruiterService = recruiterService;
        this.progressService = progressService;
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<RecruiterStatsDto> getStats() {
        return ResponseEntity.ok(recruiterService.getRecruiterStats());
    }

    @GetMapping("/jobs")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<List<JobDto>> getJobs() {
        return ResponseEntity.ok(recruiterService.getRecruiterJobs());
    }

    @PostMapping("/jobs")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<JobDto> createJob(@Valid @RequestBody JobFormDto dto) {
        return ResponseEntity.ok(recruiterService.createJob(dto));
    }

    @PostMapping(value = "/jobs/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<JobDto> uploadJobDescription(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(recruiterService.uploadJobDescription(file));
    }

    @PostMapping(value = "/jobs/{jobId}/upload-resumes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Map<String, Object>> uploadBatchResumes(
            @PathVariable Long jobId,
            @RequestParam("files") List<MultipartFile> files
    ) {
        recruiterService.saveAndProcessBatchResumes(jobId, files);
        return ResponseEntity.ok(Map.of(
                "message", "Batch resume processing initiated for " + files.size() + " files.",
                "jobId", jobId,
                "totalFiles", files.size()
        ));
    }

    @GetMapping(value = "/progress/{jobId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamProgress(@PathVariable Long jobId) {
        return progressService.createEmitter(jobId);
    }

    @GetMapping("/jobs/{jobId}/candidates")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<List<CandidateDto>> getCandidates(
            @PathVariable Long jobId,
            @RequestParam(required = false) String source
    ) {
        return ResponseEntity.ok(recruiterService.getCandidatesForJob(jobId, source));
    }

    @GetMapping("/jobs/{jobId}/upload-results")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<List<CandidateDto>> getUploadResults(
            @PathVariable Long jobId,
            @RequestParam(required = false) String batchId
    ) {
        return ResponseEntity.ok(recruiterService.getBatchResults(jobId, batchId));
    }

    @GetMapping("/jobs/{jobId}/batches")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<List<String>> getBatchesForJob(@PathVariable Long jobId) {
        return ResponseEntity.ok(recruiterService.getBatchesForJob(jobId));
    }

    @PostMapping("/applications/{appId}/accept")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<ApplicationDto> acceptCandidate(@PathVariable Long appId) {
        return ResponseEntity.ok(recruiterService.acceptCandidate(appId));
    }

    @PostMapping("/applications/{appId}/reject")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<ApplicationDto> rejectCandidate(
            @PathVariable Long appId,
            @RequestBody(required = false) Map<String, String> payload
    ) {
        return ResponseEntity.ok(recruiterService.rejectCandidate(appId, payload));
    }
}
