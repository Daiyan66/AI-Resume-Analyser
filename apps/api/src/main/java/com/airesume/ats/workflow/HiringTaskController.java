package com.airesume.ats.workflow;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class HiringTaskController {
    private static final String TASKS = """
            SELECT a.id, j.id AS job_id, j.title, a.profile_snapshot->>'displayName' AS candidate, j.organization_id,
                   a.candidate_user_id, task.kind, task.at, task.item_id
            FROM applications a JOIN jobs j ON j.id = a.job_id
            JOIN LATERAL (
              SELECT CASE WHEN s.available_from > CURRENT_TIMESTAMP THEN 'assessment_scheduled' ELSE 'assessment_due' END AS kind,
                     CASE WHEN s.available_from > CURRENT_TIMESTAMP THEN s.available_from ELSE s.due_at END AS at, s.id AS item_id
                FROM latest_assessment_attempts s WHERE s.application_id = a.id AND s.submitted_at IS NULL
                  AND s.outcome IS NULL AND s.due_at > CURRENT_TIMESTAMP
              UNION ALL
              SELECT 'assessment_review', s.submitted_at, s.id FROM assessment_assignments s
                WHERE s.application_id = a.id AND s.submitted_at IS NOT NULL AND s.outcome IS NULL
              UNION ALL
              SELECT 'interview_booking', min(slot.starts_at), o.id FROM interview_offers o
                JOIN interview_slots slot ON slot.offer_id = o.id WHERE o.application_id = a.id AND o.closed_at IS NULL
                 AND slot.starts_at > CURRENT_TIMESTAMP GROUP BY o.id
              UNION ALL
              SELECT 'interview_upcoming', i.starts_at, i.id FROM application_interviews i
                WHERE i.application_id = a.id AND i.cancelled_at IS NULL AND i.completed_at IS NULL AND i.starts_at > CURRENT_TIMESTAMP
              UNION ALL
              SELECT 'interview_reschedule', i.reschedule_requested_at, i.id FROM application_interviews i
                WHERE i.application_id = a.id AND i.cancelled_at IS NULL AND i.completed_at IS NULL AND i.reschedule_requested_at IS NOT NULL
              UNION ALL
              SELECT 'interview_expired', max(slot.starts_at), o.id FROM interview_offers o
                JOIN interview_slots slot ON slot.offer_id = o.id WHERE o.application_id = a.id AND o.closed_at IS NULL
                GROUP BY o.id HAVING max(slot.starts_at) <= CURRENT_TIMESTAMP
            ) task ON TRUE
            WHERE a.status NOT IN ('HIRED','NOT_SELECTED','WITHDRAWN')
            """;
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final OrganizationService organizations;

    public HiringTaskController(JdbcTemplate jdbc, IdentityService identities, OrganizationService organizations) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.organizations = organizations;
    }

    @GetMapping("/candidate/hiring-tasks")
    public List<Task> candidate() {
        return list("candidate_user_id", identities.currentUserId(),
                "('assessment_due','assessment_scheduled','interview_booking','interview_upcoming')");
    }

    @GetMapping("/organizations/{org}/hiring-tasks")
    public List<Task> staff(@PathVariable UUID org) {
        organizations.requireMember(org);
        return list("organization_id", org, "('assessment_review','interview_booking','interview_reschedule','interview_expired')");
    }

    private List<Task> list(String owner, UUID id, String kinds) {
        return jdbc.query("SELECT * FROM (" + TASKS + ") t WHERE " + owner + " = ? AND kind IN " + kinds +
                " ORDER BY at, id, item_id LIMIT 8", (rs, row) -> new Task(rs.getObject("id", UUID.class),
                rs.getObject("job_id", UUID.class), rs.getString("title"), rs.getString("candidate"),
                rs.getString("kind"), rs.getTimestamp("at").toInstant(), rs.getObject("item_id", UUID.class)), id);
    }

    public record Task(UUID applicationId, UUID jobId, String title, String candidate, String kind, Instant at, UUID itemId) {}
}
