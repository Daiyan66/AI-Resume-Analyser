package com.airesume.ats.workflow;

import com.airesume.ats.documents.DocumentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class OrganizationWorkflowController {
    private static final String ORG = "/organizations/{org}";
    private final OrganizationWorkflowService workflows;
    private final DeliveryService delivery;
    private final DocumentService documents;

    public OrganizationWorkflowController(OrganizationWorkflowService workflows, DeliveryService delivery, DocumentService documents) {
        this.workflows = workflows;
        this.delivery = delivery;
        this.documents = documents;
    }

    @GetMapping(ORG + "/applications")
    public OrganizationWorkflowService.ApplicationPage applications(@PathVariable UUID org,
            @RequestParam(required = false) UUID jobId,
            @RequestParam(required = false) @Pattern(regexp = "SUBMITTED|IN_REVIEW|INTERVIEW|OFFER|HIRED|NOT_SELECTED|WITHDRAWN") String status,
            @RequestParam(defaultValue = "") @Size(max = 160) String q,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return workflows.pipeline(org, jobId, status, q, page, size);
    }

    @GetMapping(ORG + "/applications/jobs")
    public List<OrganizationWorkflowService.JobOption> applicationJobs(@PathVariable UUID org) {
        return workflows.applicationJobs(org);
    }

    @GetMapping(ORG + "/reports/pipeline")
    public OrganizationWorkflowService.Report report(@PathVariable UUID org, @RequestParam(required = false) UUID jobId) {
        return workflows.report(org, jobId);
    }

    @GetMapping(ORG + "/notification-deliveries")
    public List<DeliveryService.Delivery> deliveries(@PathVariable UUID org,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return delivery.list(org, page, size);
    }

    @PostMapping(ORG + "/notification-deliveries/{notification}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void retry(@PathVariable UUID org, @PathVariable UUID notification) {
        delivery.retry(org, notification);
    }

    @GetMapping(ORG + "/data-requests")
    public List<OrganizationWorkflowService.DataReview> dataRequests(@PathVariable UUID org,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return workflows.dataRequests(org, page, size);
    }

    @PutMapping(ORG + "/data-requests/{request}/review")
    public OrganizationWorkflowService.DataReview reviewData(@PathVariable UUID org, @PathVariable UUID request,
                                                               @Valid @RequestBody ReviewData body) {
        return workflows.reviewData(org, request, body.outcome(), body.reason());
    }

    @PostMapping("/recruiter-access-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationWorkflowService.AccessRequest requestAccess(@Valid @RequestBody RequestAccess body) {
        return workflows.requestAccess(body);
    }

    @GetMapping("/recruiter-access-requests")
    public List<OrganizationWorkflowService.AccessRequest> myAccessRequests() {
        return workflows.myAccessRequests();
    }

    @GetMapping(ORG + "/recruiter-access-requests")
    public List<OrganizationWorkflowService.AccessRequest> accessRequests(@PathVariable UUID org,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return workflows.accessRequests(org, page, size);
    }

    @GetMapping(ORG + "/recruiter-access-requests/{request}/document")
    public ResponseEntity<Resource> verificationDocument(@PathVariable UUID org, @PathVariable UUID request) {
        var file = documents.downloadForVerification(org, request);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.metadata().mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.metadata().filename()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store").body(file.resource());
    }

    @PutMapping(ORG + "/recruiter-access-requests/{request}/decision")
    public OrganizationWorkflowService.AccessRequest reviewAccess(@PathVariable UUID org, @PathVariable UUID request,
                                                                    @Valid @RequestBody ReviewAccess body) {
        return workflows.reviewAccess(org, request, body.outcome());
    }

    public record ReviewData(@NotBlank @Pattern(regexp = "RETAIN|ELIGIBLE_FOR_REMOVAL") String outcome,
                             @NotBlank @Size(max = 1000) String reason) {}
    public record RequestAccess(@NotBlank @Size(max = 80) String organizationSlug, @NotNull UUID documentId,
                                @NotBlank @Size(max = 160) String designation, @Size(max = 300) String website,
                                @Size(max = 40) String phone, @Size(max = 500) String disciplines) {}
    public record ReviewAccess(@NotBlank @Pattern(regexp = "APPROVED|REJECTED") String outcome) {}
}
