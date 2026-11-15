package com.airesume.ats.candidate;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
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
@RequestMapping("/api/v1/candidate")
public class CandidateController {
    private final CandidateService candidates;

    public CandidateController(CandidateService candidates) { this.candidates = candidates; }

    @GetMapping("/profile")
    public CandidateService.Profile profile() { return candidates.profile(); }

    @PutMapping("/profile")
    public CandidateService.Profile saveProfile(@Valid @RequestBody CandidateService.Profile profile) {
        return candidates.saveProfile(profile);
    }

    @GetMapping("/applications")
    public CandidateService.Page applications(@RequestParam(defaultValue = "0") @Min(0) int page,
                                              @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        return candidates.applications(page, size);
    }

    @GetMapping("/applications/{id}")
    public CandidateService.Application application(@PathVariable UUID id) { return candidates.application(id); }

    @PostMapping("/applications")
    public ResponseEntity<CandidateService.Application> submit(@Valid @RequestBody SubmitApplication request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                candidates.submit(request.jobId(), request.documentId(), request.answers()));
    }

    @PostMapping("/applications/{id}/withdraw")
    public CandidateService.Application withdraw(@PathVariable UUID id) { return candidates.withdraw(id); }

    @GetMapping("/export")
    public ResponseEntity<Map<String, Object>> export() {
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename("candidate-data.json").build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(candidates.export());
    }

    @PostMapping("/deletion-requests")
    public ResponseEntity<CandidateService.DataRequest> requestDeletion() {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(candidates.requestDeletion());
    }

    @GetMapping("/deletion-requests")
    public List<CandidateService.DataRequest> deletionRequests() { return candidates.dataRequests(); }

    public record SubmitApplication(@NotNull UUID jobId, UUID documentId,
                                    @Size(max = 10) Map<UUID, String> answers) {}
}
