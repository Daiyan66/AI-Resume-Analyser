package com.airesume.ats.workflow;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/organizations/{org}/recruiter-notifications")
public class RecruiterNotificationController {
    private static final String EVENTS = """
            SELECT action.kind || '-' || a.id AS event_key, action.kind, a.id AS application_id, a.job_id,
                   NULL::uuid AS person_id, a.profile_snapshot->>'displayName' AS actor, j.title AS subject, action.happened_at
            FROM applications a JOIN jobs j ON j.id = a.job_id
            CROSS JOIN LATERAL (VALUES ('submitted', a.submitted_at), ('withdrawn', a.withdrawn_at)) AS action(kind, happened_at)
            WHERE j.organization_id = :org AND action.happened_at IS NOT NULL
            UNION ALL
            SELECT 'chat-' || t.id, 'chat', NULL, NULL, CASE WHEN t.recipient_id IS NOT NULL THEN t.sender_id END,
                   u.display_name, NULL, t.sent_at
            FROM team_messages t JOIN users u ON u.id = t.sender_id
            WHERE t.organization_id = :org AND t.sender_id <> :user
              AND (t.recipient_id IS NULL OR t.recipient_id = :user)
            """;
    private final NamedParameterJdbcTemplate jdbc;
    private final IdentityService identities;
    private final OrganizationService organizations;

    public RecruiterNotificationController(NamedParameterJdbcTemplate jdbc, IdentityService identities, OrganizationService organizations) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.organizations = organizations;
    }

    @GetMapping
    public Page list(@PathVariable UUID org, @RequestParam(defaultValue = "false") boolean unread,
                     @RequestParam(defaultValue = "0") @Min(0) int page,
                     @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        organizations.requireMember(org);
        var user = identities.currentUserId();
        var args = Map.of("org", org, "user", user, "size", size, "offset", (long) page * size);
        var from = " FROM (" + EVENTS + ") n LEFT JOIN recruiter_notification_reads r ON " +
                "r.organization_id = :org AND r.user_id = :user AND r.event_key = n.event_key" +
                (unread ? " WHERE r.event_key IS NULL" : "");
        long total = jdbc.queryForObject("SELECT count(*)" + from, args, Long.class);
        var items = jdbc.query("SELECT n.*, r.event_key IS NOT NULL AS is_read" + from +
                        " ORDER BY n.happened_at DESC, n.event_key DESC LIMIT :size OFFSET :offset", args,
                (rs, row) -> new Item(rs.getString("event_key"), rs.getString("kind"), rs.getObject("application_id", UUID.class),
                        rs.getObject("job_id", UUID.class), rs.getObject("person_id", UUID.class), rs.getString("actor"),
                        rs.getString("subject"), rs.getTimestamp("happened_at").toInstant(), rs.getBoolean("is_read")));
        return new Page(items, page, size, total);
    }

    @PutMapping("/{key}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@PathVariable UUID org, @PathVariable @Size(max = 60) String key) {
        organizations.requireMember(org);
        var args = Map.of("org", org, "user", identities.currentUserId(), "key", key);
        var visible = jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM (" + EVENTS + ") n WHERE event_key = :key)",
                args, Boolean.class);
        if (!Boolean.TRUE.equals(visible)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        jdbc.update("INSERT INTO recruiter_notification_reads (organization_id, user_id, event_key) " +
                "VALUES (:org, :user, :key) ON CONFLICT DO NOTHING", args);
    }

    public record Item(String key, String kind, UUID applicationId, UUID jobId, UUID personId, String actor,
                       String subject, Instant happenedAt, boolean read) {}
    public record Page(List<Item> items, int page, int size, long total) {}
}
