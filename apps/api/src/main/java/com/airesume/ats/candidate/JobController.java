package com.airesume.ats.candidate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class JobController {
    private final JobService jobs;

    public JobController(JobService jobs) { this.jobs = jobs; }

    @GetMapping("/public/jobs")
    public JobService.Page publicJobs(@RequestParam(defaultValue = "0") @Min(0) int page,
                                      @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return jobs.publicJobs(page, size);
    }

    @GetMapping("/public/jobs/{jobId}")
    public JobService.Job publicJob(@PathVariable UUID jobId) { return jobs.publicJob(jobId); }

    @GetMapping("/organizations/{organizationId}/jobs")
    public JobService.Page organizationJobs(@PathVariable UUID organizationId,
                                           @RequestParam(defaultValue = "0") @Min(0) int page,
                                           @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return jobs.organizationJobs(organizationId, page, size);
    }

    @PostMapping("/organizations/{organizationId}/jobs")
    public ResponseEntity<JobService.Job> create(@PathVariable UUID organizationId, @Valid @RequestBody CreateJob request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(jobs.create(organizationId, request));
    }

    @PostMapping("/organizations/{organizationId}/jobs/{jobId}/publish")
    public JobService.Job publish(@PathVariable UUID organizationId, @PathVariable UUID jobId) {
        return jobs.publish(organizationId, jobId);
    }

    @GetMapping("/organizations/{organizationId}/jobs/{jobId}")
    public JobService.Job privateJob(@PathVariable UUID organizationId, @PathVariable UUID jobId) {
        return jobs.privateJob(organizationId, jobId);
    }

    @PutMapping("/organizations/{organizationId}/jobs/{jobId}")
    public JobService.Job updateDraft(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                      @Valid @RequestBody CreateJob request) {
        return jobs.updateDraft(organizationId, jobId, request);
    }

    @PostMapping("/organizations/{organizationId}/jobs/{jobId}/status")
    public JobService.Job changeStatus(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                       @Valid @RequestBody JobStatusRequest request) {
        return jobs.changeStatus(organizationId, jobId, request.status());
    }

    public record QuestionInput(@NotBlank @Size(max = 500) String prompt, boolean required) {}
    public record CriterionInput(@NotBlank @Size(max = 500) String description,
                                 @NotBlank @Pattern(regexp = "REQUIRED|PREFERRED") String importance,
                                 @Size(max = 1000) String guidance) {}
    public record JobStatusRequest(@NotBlank @Pattern(regexp = "PUBLISHED|PAUSED|CLOSED") String status) {}
    public record CreateJob(@NotBlank @Size(max = 160) String title,
                            @NotBlank @Size(max = 160) String location,
                            @NotBlank @Pattern(regexp = "REMOTE|HYBRID|ONSITE") String workType,
                            @Min(0) Integer salaryMin, @Min(0) Integer salaryMax,
                            @Pattern(regexp = "[A-Z]{3}") String currency,
                            @NotBlank @Size(max = 20000) String description,
                            @NotBlank @Size(max = 10000) String requirements,
                            @Size(max = 10) List<@Valid QuestionInput> questions,
                            @Size(max = 20) List<@Valid CriterionInput> criteria) {
        public CreateJob {
            if (questions == null) questions = List.of();
            if (criteria == null) criteria = List.of();
        }
    }
}
