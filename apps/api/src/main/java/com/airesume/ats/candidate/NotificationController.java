package com.airesume.ats.candidate;

import com.airesume.ats.identity.IdentityService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/candidate/notifications")
public class NotificationController {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;

    public NotificationController(JdbcTemplate jdbc, IdentityService identities) {
        this.jdbc = jdbc;
        this.identities = identities;
    }

    @GetMapping
    public Page list(@RequestParam(defaultValue = "0") @Min(0) int page,
                     @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size,
                     @RequestParam(required = false) Boolean read) {
        UUID userId = identities.currentUserId();
        String filter = " WHERE recipient_user_id = ?" +
                (read == null ? "" : read ? " AND read_at IS NOT NULL" : " AND read_at IS NULL");
        long total = jdbc.queryForObject("SELECT count(*) FROM candidate_notifications" + filter, Long.class, userId);
        List<Notification> items = jdbc.query("SELECT id, application_id, message, created_at, read_at " +
                        "FROM candidate_notifications" + filter + " ORDER BY created_at DESC, id DESC " +
                        "LIMIT ? OFFSET ?", (rs, row) -> new Notification(rs.getObject("id", UUID.class),
                        rs.getObject("application_id", UUID.class), rs.getString("message"),
                        rs.getTimestamp("created_at").toInstant(), rs.getTimestamp("read_at") != null),
                userId, size, (long) page * size);
        return new Page(items, page, size, total);
    }

    @PostMapping("/read-all")
    public ReadResult readAll() {
        int count = jdbc.update("UPDATE candidate_notifications SET read_at = CURRENT_TIMESTAMP " +
                "WHERE recipient_user_id = ? AND read_at IS NULL", identities.currentUserId());
        return new ReadResult(count);
    }

    public record ReadResult(int markedRead) {}

    @PostMapping("/{notificationId}/read")
    public Notification read(@PathVariable UUID notificationId) {
        UUID userId = identities.currentUserId();
        int changed = jdbc.update("UPDATE candidate_notifications SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP) " +
                "WHERE id = ? AND recipient_user_id = ?", notificationId, userId);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found.");
        return jdbc.queryForObject("SELECT id, application_id, message, created_at, read_at " +
                        "FROM candidate_notifications WHERE id = ?", (rs, row) -> new Notification(
                        rs.getObject("id", UUID.class), rs.getObject("application_id", UUID.class),
                        rs.getString("message"), rs.getTimestamp("created_at").toInstant(), true), notificationId);
    }

    public record Notification(UUID id, UUID applicationId, String message, Instant createdAt, boolean read) {}
    public record Page(List<Notification> items, int page, int size, long total) {}
}
