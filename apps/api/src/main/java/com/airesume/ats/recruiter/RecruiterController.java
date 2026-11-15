package com.airesume.ats.recruiter;

import com.airesume.ats.documents.DocumentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/organizations/{organizationId}/jobs/{jobId}/applications")
public class RecruiterController {
    private final RecruiterService recruiters;
    private final DocumentService documents;

    public RecruiterController(RecruiterService recruiters, DocumentService documents) {
        this.recruiters = recruiters;
        this.documents = documents;
    }

    @GetMapping
    public RecruiterService.Page pipeline(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                          @RequestParam(defaultValue = "0") @Min(0) int page,
                                          @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return recruiters.pipeline(organizationId, jobId, page, size);
    }

    @GetMapping("/{applicationId}")
    public RecruiterService.Detail detail(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                          @PathVariable UUID applicationId) {
        return recruiters.detail(organizationId, jobId, applicationId);
    }

    @GetMapping("/{applicationId}/document")
    public ResponseEntity<Resource> document(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                             @PathVariable UUID applicationId) {
        DocumentService.Download file = documents.downloadForReview(organizationId, jobId, applicationId);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.metadata().mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.metadata().filename()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store").body(file.resource());
    }

    @PostMapping("/{applicationId}/reviews")
    public RecruiterService.Review review(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                          @PathVariable UUID applicationId, @Valid @RequestBody ReviewRequest request) {
        return recruiters.review(organizationId, jobId, applicationId,
                request.criterionId(), request.rating(), request.note());
    }

    @PostMapping("/{applicationId}/stage")
    public RecruiterService.Detail advance(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                           @PathVariable UUID applicationId, @Valid @RequestBody StageRequest request) {
        return recruiters.advance(organizationId, jobId, applicationId, request.status());
    }

    @PostMapping("/{applicationId}/decisions")
    public RecruiterService.Detail decide(@PathVariable UUID organizationId, @PathVariable UUID jobId,
                                          @PathVariable UUID applicationId, @Valid @RequestBody DecisionRequest request) {
        return recruiters.decide(organizationId, jobId, applicationId, request.outcome(), request.reason());
    }

    public record ReviewRequest(@NotNull UUID criterionId,
                                @NotBlank @Pattern(regexp = "MET|PARTIAL|NOT_MET|UNCLEAR") String rating,
                                @NotBlank @Size(min = 5, max = 2000) String note) {}
    public record StageRequest(@NotBlank @Pattern(regexp = "IN_REVIEW|INTERVIEW|OFFER") String status) {}
    public record DecisionRequest(@NotBlank @Pattern(regexp = "HIRED|NOT_SELECTED") String outcome,
                                  @NotBlank @Size(min = 10, max = 4000) String reason) {}
}
