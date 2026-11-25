package com.airesume.ats.workflow;

import com.airesume.ats.documents.DocumentService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AssessmentController {
    private static final String TEMPLATES = "/organizations/{org}/jobs/{job}/assessment-templates";
    private static final String STAFF = "/organizations/{org}/applications/{application}/assessments";
    private static final String CANDIDATE = "/candidate/applications/{application}/assessments";
    private final AssessmentService assessments;
    private final DocumentService documents;
    private final AssessmentAi ai;

    public AssessmentController(AssessmentService assessments, DocumentService documents, AssessmentAi ai) {
        this.assessments = assessments;
        this.documents = documents;
        this.ai = ai;
    }

    @GetMapping(TEMPLATES)
    public List<AssessmentService.Template> templates(@PathVariable UUID org, @PathVariable UUID job,
            @RequestParam(defaultValue = "0") @Min(0) int page) {
        return assessments.templates(org, job, page);
    }

    @PostMapping(TEMPLATES)
    public AssessmentService.Template create(@PathVariable UUID org, @PathVariable UUID job,
            @Valid @RequestBody AssessmentService.TemplateInput input) {
        return assessments.saveTemplate(org, job, null, input);
    }

    @PutMapping(TEMPLATES + "/{id}")
    public AssessmentService.Template edit(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID id,
            @Valid @RequestBody AssessmentService.TemplateInput input) {
        return assessments.saveTemplate(org, job, id, input);
    }

    @PostMapping(TEMPLATES + "/{id}/publish")
    public AssessmentService.Template publish(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID id) {
        return assessments.publish(org, job, id);
    }

    @PostMapping(TEMPLATES + "/suggestions")
    public AssessmentAi.Suggestion suggest(@PathVariable UUID org, @PathVariable UUID job) {
        return ai.suggest(org, job);
    }

    @GetMapping(STAFF)
    public List<AssessmentService.Assignment> assigned(@PathVariable UUID org, @PathVariable UUID application) {
        return assessments.staffAssignments(org, application);
    }

    @PostMapping(STAFF)
    public AssessmentService.Assignment assign(@PathVariable UUID org, @PathVariable UUID application,
            @Valid @RequestBody Assign input) {
        return assessments.assign(org, application, input.templateId(), input.dueAt());
    }

    @PostMapping(STAFF + "/{id}/review")
    public AssessmentService.Assignment review(@PathVariable UUID org, @PathVariable UUID application, @PathVariable UUID id,
            @Valid @RequestBody AssessmentService.Review input) {
        return assessments.review(org, application, id, input);
    }

    @PostMapping(STAFF + "/{id}/evidence")
    public List<AssessmentAi.Evidence> evidence(@PathVariable UUID org, @PathVariable UUID application, @PathVariable UUID id) {
        return ai.evidence(org, application, id);
    }

    @GetMapping(STAFF + "/{id}/attachment")
    public ResponseEntity<Resource> attachment(@PathVariable UUID org, @PathVariable UUID application, @PathVariable UUID id) {
        var file = documents.downloadForAssessment(org, application, id);
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(file.metadata().mediaType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(file.metadata().filename()).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store").body(file.resource());
    }

    @GetMapping(CANDIDATE)
    public List<AssessmentService.Assignment> mine(@PathVariable UUID application) {
        return assessments.candidateAssignments(application);
    }

    @PutMapping(CANDIDATE + "/{id}/draft")
    public AssessmentService.Assignment draft(@PathVariable UUID application, @PathVariable UUID id,
            @Valid @RequestBody AssessmentService.Response input) {
        return assessments.save(application, id, input, false);
    }

    @PostMapping(CANDIDATE + "/{id}/submit")
    public AssessmentService.Assignment submit(@PathVariable UUID application, @PathVariable UUID id,
            @Valid @RequestBody AssessmentService.Response input) {
        return assessments.save(application, id, input, true);
    }

    @GetMapping(CANDIDATE + "/practice")
    public List<String> practice(@PathVariable UUID application) { return assessments.practice(application); }

    @PostMapping(CANDIDATE + "/practice/ai")
    public List<String> aiPractice(@PathVariable UUID application) { return ai.practice(application); }

    public record Assign(@NotNull UUID templateId, @NotNull Instant dueAt) {}
}
