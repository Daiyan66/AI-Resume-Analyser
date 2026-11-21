package com.airesume.ats.workflow;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class InterviewController {
    private static final String RECRUITER = "/organizations/{org}/jobs/{job}/applications/{application}/interviews";
    private final InterviewService interviews;
    public InterviewController(InterviewService interviews) { this.interviews = interviews; }

    @GetMapping("/candidate/applications/{application}/interviews")
    public List<InterviewService.Interview> mine(@PathVariable UUID application) {
        return interviews.forCandidate(application);
    }

    @GetMapping(RECRUITER)
    public List<InterviewService.Interview> list(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID application) {
        return interviews.forRecruiter(org, job, application);
    }

    @PostMapping(RECRUITER)
    @ResponseStatus(HttpStatus.CREATED)
    public InterviewService.Interview schedule(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID application,
                                                @Valid @RequestBody Schedule body) {
        return interviews.schedule(org, job, application, body.startsAt(), body.timezone(), body.location(), body.message());
    }

    @DeleteMapping(RECRUITER + "/{interview}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable UUID org, @PathVariable UUID job, @PathVariable UUID application, @PathVariable UUID interview) {
        interviews.cancel(org, job, application, interview);
    }

    public record Schedule(@NotNull Instant startsAt, @NotBlank @Size(max = 80) String timezone,
                           @NotBlank @Size(max = 500) String location, @NotNull @Size(max = 2000) String message) {}
}
