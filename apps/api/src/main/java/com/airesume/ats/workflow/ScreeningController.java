package com.airesume.ats.workflow;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
public class ScreeningController {
    private static final String JOB = "/organizations/{org}/jobs/{job}";
    private final ScreeningService screening;
    public ScreeningController(ScreeningService screening) { this.screening = screening; }

    @PostMapping(path = "/organizations/{org}/jobs/import-draft", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ScreeningService.ImportedDraft importJob(@PathVariable UUID org, @RequestParam MultipartFile file) {
        return screening.importJob(org, file);
    }

    @PostMapping(path = JOB + "/screening-batches", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ScreeningService.Batch screen(@PathVariable UUID org, @PathVariable UUID job, @RequestParam List<MultipartFile> files) {
        return screening.screen(org, job, files);
    }

    @GetMapping(JOB + "/screening-batches")
    public List<ScreeningService.Summary> batches(@PathVariable UUID org, @PathVariable UUID job,
            @RequestParam(defaultValue = "0") @Min(0) int page, @RequestParam(defaultValue = "20") @Min(1) @Max(50) int size) {
        return screening.batches(org, job, page, size);
    }

    @GetMapping(JOB + "/screening-batches/{batch}")
    public ScreeningService.Batch batch(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID batch) {
        return screening.batch(org, job, batch);
    }

    @DeleteMapping(JOB + "/screening-batches/{batch}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID batch) {
        screening.deleteBatch(org, job, batch);
    }

    @GetMapping(JOB + "/applications/{application}/evidence")
    public List<ScreeningService.Finding> evidence(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID application) {
        return screening.applicationEvidence(org, job, application);
    }

    @GetMapping("/documents/{document}/text")
    public ScreeningService.ExtractedText ownDocumentText(@PathVariable UUID document) {
        return screening.ownDocumentText(document);
    }

    @GetMapping("/candidate/applications/{application}/coaching")
    public List<ScreeningService.CoachingTip> coaching(@PathVariable UUID application) {
        return screening.coaching(application);
    }
}
