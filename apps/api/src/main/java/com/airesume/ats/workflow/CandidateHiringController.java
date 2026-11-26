package com.airesume.ats.workflow;

import com.airesume.ats.identity.IdentityService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/candidate/hiring-applications")
public class CandidateHiringController {
    private static final String HAS_ASSESSMENT =
            " AND EXISTS (SELECT 1 FROM assessment_assignments s WHERE s.application_id = a.id)";
    private static final String SUMMARY = """
            SELECT a.id, a.job_id, a.status, a.submitted_at, j.title, o.name AS organization,
              CASE
                WHEN a.status IN ('HIRED', 'NOT_SELECTED', 'WITHDRAWN') THEN 'closed'
                WHEN assessment.kind IS NOT NULL THEN assessment.kind
                WHEN a.status = 'OFFER' THEN 'offer'
                WHEN offer.starts_at IS NOT NULL AND confirmed.reschedule_requested_at IS NOT NULL THEN 'interview_booking'
                WHEN confirmed.starts_at IS NOT NULL THEN 'interview_upcoming'
                WHEN offer.starts_at IS NOT NULL THEN 'interview_booking'
                WHEN EXISTS (SELECT 1 FROM application_interviews i
                    WHERE i.application_id = a.id AND i.completed_at IS NOT NULL) THEN 'interview_completed'
                WHEN EXISTS (SELECT 1 FROM application_interviews i WHERE i.application_id = a.id
                    AND i.cancelled_at IS NULL AND i.starts_at <= CURRENT_TIMESTAMP) THEN 'interview_elapsed'
                WHEN a.status = 'INTERVIEW' OR EXISTS (
                   SELECT 1 FROM latest_assessment_attempts s WHERE s.application_id = a.id AND s.outcome = 'PASSED'
                ) THEN 'interview_pending'
                ELSE 'application_review'
              END AS next_kind,
              CASE WHEN a.status IN ('HIRED', 'NOT_SELECTED', 'WITHDRAWN') THEN NULL
                   WHEN assessment.kind IS NOT NULL THEN assessment.at
                   WHEN offer.starts_at IS NOT NULL AND confirmed.reschedule_requested_at IS NOT NULL THEN offer.starts_at
                   ELSE COALESCE(confirmed.starts_at, offer.starts_at) END AS next_at,
              CASE WHEN a.status NOT IN ('HIRED', 'NOT_SELECTED', 'WITHDRAWN') THEN assessment.title END AS assessment_title,
              assessment.available_from AS assessment_opens, assessment.due_at AS assessment_closes
            FROM applications a
            JOIN jobs j ON j.id = a.job_id JOIN organizations o ON o.id = j.organization_id
            LEFT JOIN LATERAL (
                SELECT t.title, s.available_from, s.due_at,
                   CASE WHEN s.outcome = 'RETRY' THEN 'assessment_retry'
                        WHEN s.submitted_at IS NOT NULL THEN 'assessment_review'
                        WHEN s.outcome = 'EXPIRED' OR s.due_at <= CURRENT_TIMESTAMP THEN 'assessment_expired'
                        WHEN s.available_from > CURRENT_TIMESTAMP THEN 'assessment_scheduled'
                        ELSE 'assessment_due' END AS kind,
                   CASE WHEN s.outcome = 'RETRY' THEN NULL
                        WHEN s.submitted_at IS NOT NULL THEN s.submitted_at
                        WHEN s.available_from > CURRENT_TIMESTAMP THEN s.available_from
                        ELSE s.due_at END AS at
                FROM latest_assessment_attempts s JOIN assessment_templates t ON t.id = s.template_id
                WHERE s.application_id = a.id AND s.outcome IS DISTINCT FROM 'PASSED'
                ORDER BY CASE WHEN s.submitted_at IS NULL AND s.due_at > CURRENT_TIMESTAMP THEN 0 ELSE 1 END,
                    s.due_at, s.id LIMIT 1
            ) assessment ON TRUE
            LEFT JOIN LATERAL (
                SELECT i.starts_at, i.reschedule_requested_at FROM application_interviews i WHERE i.application_id = a.id AND i.cancelled_at IS NULL
                  AND i.completed_at IS NULL AND i.starts_at + i.minutes * INTERVAL '1 minute' > CURRENT_TIMESTAMP
                ORDER BY i.starts_at LIMIT 1
            ) confirmed ON TRUE
            LEFT JOIN LATERAL (
                SELECT min(t.starts_at) AS starts_at FROM interview_offers x JOIN interview_slots t ON t.offer_id = x.id
                WHERE x.application_id = a.id AND x.closed_at IS NULL AND t.starts_at > CURRENT_TIMESTAMP
            ) offer ON TRUE
            WHERE a.candidate_user_id = ?
            """;
    private final JdbcTemplate jdbc;
    private final IdentityService identities;

    public CandidateHiringController(JdbcTemplate jdbc, IdentityService identities) {
        this.jdbc = jdbc;
        this.identities = identities;
    }

    @GetMapping
    public Page list(@RequestParam(defaultValue = "0") @Min(0) int page,
                     @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        UUID candidate = identities.currentUserId();
        long total = jdbc.queryForObject("SELECT count(*) FROM applications a WHERE candidate_user_id = ?" +
                HAS_ASSESSMENT, Long.class, candidate);
        // Select the requested page before calculating each application's next action.
        String source = """
                FROM (SELECT * FROM applications a WHERE candidate_user_id = ? %s
                      ORDER BY submitted_at DESC, id LIMIT ? OFFSET ?) a
                """.formatted(HAS_ASSESSMENT).strip();
        List<Progress> items = jdbc.query(SUMMARY.replace("FROM applications a", source) + " ORDER BY a.submitted_at DESC, a.id",
                CandidateHiringController::map, candidate, size, (long) page * size, candidate);
        return new Page(items, page, size, total);
    }

    @GetMapping("/{application}")
    public Progress details(@PathVariable UUID application) {
        return jdbc.query(SUMMARY + HAS_ASSESSMENT + " AND a.id = ?", CandidateHiringController::map, identities.currentUserId(), application)
                .stream().findFirst().orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found."));
    }

    private static Progress map(ResultSet rs, int row) throws SQLException {
        var at = rs.getTimestamp("next_at");
        var opens = rs.getTimestamp("assessment_opens");
        var closes = rs.getTimestamp("assessment_closes");
        return new Progress(rs.getObject("id", UUID.class), rs.getObject("job_id", UUID.class), rs.getString("title"),
                rs.getString("organization"), rs.getString("status"), rs.getTimestamp("submitted_at").toInstant(),
                rs.getString("next_kind"), at == null ? null : at.toInstant(), rs.getString("assessment_title"),
                opens == null ? null : opens.toInstant(), closes == null ? null : closes.toInstant());
    }

    public record Progress(UUID id, UUID jobId, String jobTitle, String organizationName, String status,
                           Instant submittedAt, String nextKind, Instant nextAt, String assessmentTitle, Instant assessmentOpens, Instant assessmentCloses) {}
    public record Page(List<Progress> items, int page, int size, long total) {}
}
