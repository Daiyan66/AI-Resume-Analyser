package com.airesume.ats.workflow;

import com.airesume.ats.candidate.JobService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.security.AuditService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.DateTimeException;
import java.time.Instant;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class InterviewService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final JobService jobs;
    private final AuditService audit;
    private final DeliveryService delivery;

    public InterviewService(JdbcTemplate jdbc, IdentityService identities, JobService jobs, AuditService audit,
                            DeliveryService delivery) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.jobs = jobs;
        this.audit = audit;
        this.delivery = delivery;
    }

    public List<Interview> forCandidate(UUID application) {
        requireApplication(application, "candidate_user_id", identities.currentUserId(), false);
        return interviews(application);
    }

    public List<Interview> forRecruiter(UUID org, UUID job, UUID application) {
        jobs.privateJob(org, job);
        requireApplication(application, "job_id", job, false);
        return interviews(application);
    }

    @Transactional
    public Interview schedule(UUID org, UUID job, UUID application, Instant startsAt, String timezone,
                              String location, String message) {
        jobs.privateJob(org, job);
        String stage = requireApplication(application, "job_id", job, true);
        if (!List.of("IN_REVIEW", "INTERVIEW").contains(stage)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Move this application to In review or Interview first.");
        }
        if (!startsAt.isAfter(Instant.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a future time.");
        try { ZoneId.of(timezone); }
        catch (DateTimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose an IANA time zone."); }
        if (interviews(application).stream().anyMatch(i -> i.cancelledAt() == null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cancel the current interview before scheduling a replacement.");
        }
        UUID id = UUID.randomUUID();
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO application_interviews (id, application_id, created_by, starts_at, timezone, location, message) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)", id, application, actor, Timestamp.from(startsAt), timezone, location.trim(), message.trim());
        delivery.notifyCandidate(org, application, "An interview was scheduled. Open your application for the details.");
        audit.record(actor, org, "interview.schedule", "interview", id);
        return jdbc.queryForObject("SELECT * FROM application_interviews WHERE id = ?", InterviewService::map, id);
    }

    @Transactional
    public void cancel(UUID org, UUID job, UUID application, UUID interview) {
        jobs.privateJob(org, job);
        requireApplication(application, "job_id", job, true);
        int changed = jdbc.update("UPDATE application_interviews SET cancelled_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND application_id = ? AND cancelled_at IS NULL", interview, application);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled interview not found.");
        delivery.notifyCandidate(org, application, "An interview for your application was cancelled.");
        audit.record(identities.currentUserId(), org, "interview.cancel", "interview", interview);
    }

    private List<Interview> interviews(UUID application) {
        return jdbc.query("SELECT * FROM application_interviews WHERE application_id = ? ORDER BY created_at DESC, id",
                InterviewService::map, application);
    }

    private String requireApplication(UUID application, String admissibleColumn, UUID owner, boolean lock) {
        var statuses = jdbc.query("SELECT status FROM applications WHERE id = ? AND " + admissibleColumn + " = ?" +
                (lock ? " FOR UPDATE" : ""), (rs, row) -> rs.getString(1), application, owner);
        if (statuses.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found.");
        return statuses.getFirst();
    }

    private static Interview map(ResultSet rs, int row) throws SQLException {
        Timestamp cancelled = rs.getTimestamp("cancelled_at");
        return new Interview(rs.getObject("id", UUID.class), rs.getTimestamp("starts_at").toInstant(),
                rs.getString("timezone"), rs.getString("location"), rs.getString("message"),
                cancelled == null ? null : cancelled.toInstant());
    }

    public record Interview(UUID id, Instant startsAt, String timezone, String location, String message, Instant cancelledAt) {}
}
