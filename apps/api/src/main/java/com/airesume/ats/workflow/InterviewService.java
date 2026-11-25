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
        requireInterviewStage(requireApplication(application, "job_id", job, true));
        validateTime(startsAt, timezone);
        ensureNoInterview(application);
        UUID organizer = identities.currentUserId();
        lockCalendars(application, organizer);
        if (!available(application, organizer, startsAt, 30)) throw conflict("This time overlaps an existing interview.");
        closeOffer(application);
        return confirm(org, application, organizer, startsAt, 30, timezone, location, message);
    }

    public Offer offerForCandidate(UUID application) {
        String stage = requireApplication(application, "candidate_user_id", identities.currentUserId(), false);
        if (!List.of("IN_REVIEW", "INTERVIEW").contains(stage)) return null;
        Offer offer = openOffer(application);
        if (offer == null) return null;
        var slots = offer.slots().stream().filter(slot -> slot.startsAt().isAfter(Instant.now()) &&
                available(application, offer.organizerId(), slot.startsAt(), offer.minutes())).toList();
        return new Offer(offer.id(), offer.organizerId(), offer.minutes(), offer.timezone(), offer.location(), offer.message(), slots);
    }

    public Offer offerForRecruiter(UUID org, UUID job, UUID application) {
        jobs.privateJob(org, job);
        requireApplication(application, "job_id", job, false);
        return openOffer(application);
    }

    @Transactional
    public Offer propose(UUID org, UUID job, UUID application, List<Instant> times, int minutes, String timezone,
                         String location, String message) {
        jobs.privateJob(org, job);
        requireInterviewStage(requireApplication(application, "job_id", job, true));
        Interview current = activeInterview(application);
        if (current != null && (current.rescheduleRequestedAt() == null || !current.startsAt().isAfter(Instant.now()))) {
            throw conflict("The current interview must be completed or have an open reschedule request.");
        }
        var ordered = times.stream().distinct().sorted().toList();
        if (ordered.size() != times.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose distinct interview times.");
        }
        ordered.forEach(time -> validateTime(time, timezone));
        closeOffer(application);
        UUID id = UUID.randomUUID();
        UUID organizer = identities.currentUserId();
        jdbc.update("INSERT INTO interview_offers(id, application_id, organizer_id, minutes, timezone, location, message) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?)", id, application, organizer, minutes, timezone, location.trim(), message.trim());
        for (Instant time : ordered) {
            jdbc.update("INSERT INTO interview_slots(id, offer_id, starts_at) VALUES (?, ?, ?)",
                    UUID.randomUUID(), id, Timestamp.from(time));
        }
        delivery.notifyCandidate(org, application, "Interview times are available. Choose a time in Assessment & Interview.");
        audit.record(organizer, org, "interview.offer", "application", application);
        return openOffer(application);
    }

    @Transactional
    public Interview book(UUID application, UUID slotId) {
        UUID candidate = identities.currentUserId();
        requireInterviewStage(requireApplication(application, "candidate_user_id", candidate, true));
        Interview current = activeInterview(application);
        if (current != null && (current.rescheduleRequestedAt() == null || !current.startsAt().isAfter(Instant.now()))) {
            throw conflict("An interview is already scheduled.");
        }
        Offer offer = openOffer(application);
        Slot slot = offer == null ? null : offer.slots().stream().filter(item -> item.id().equals(slotId)).findFirst().orElse(null);
        if (slot == null) throw conflict("Those interview times changed. Refresh and choose an available time.");
        lockCalendars(application, offer.organizerId());
        if (!slot.startsAt().isAfter(Instant.now()) || !available(application, offer.organizerId(), slot.startsAt(), offer.minutes())) {
            throw conflict("That time is no longer available. Choose another time.");
        }
        UUID org = jdbc.queryForObject("SELECT j.organization_id FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?",
                UUID.class, application);
        closeOffer(application);
        if (current != null) {
            jdbc.update("UPDATE application_interviews SET cancelled_at = CURRENT_TIMESTAMP WHERE id = ?", current.id());
            audit.record(candidate, org, "interview.reschedule", "interview", current.id());
        }
        return confirm(org, application, offer.organizerId(), slot.startsAt(), offer.minutes(), offer.timezone(),
                offer.location(), offer.message());
    }

    @Transactional
    public void requestReschedule(UUID application, UUID interview) {
        requireInterviewStage(requireApplication(application, "candidate_user_id", identities.currentUserId(), true));
        int changed = jdbc.update("UPDATE application_interviews SET reschedule_requested_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND application_id = ? AND cancelled_at IS NULL AND completed_at IS NULL " +
                "AND reschedule_requested_at IS NULL AND starts_at > CURRENT_TIMESTAMP", interview, application);
        if (changed != 1) throw conflict("This interview is unavailable or already has a reschedule request.");
    }

    @Transactional
    public void complete(UUID org, UUID job, UUID application, UUID interview) {
        jobs.privateJob(org, job);
        requireApplication(application, "job_id", job, true);
        int changed = jdbc.update("UPDATE application_interviews SET completed_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND application_id = ? AND cancelled_at IS NULL AND completed_at IS NULL AND starts_at <= CURRENT_TIMESTAMP",
                interview, application);
        if (changed != 1) throw conflict("Only an interview that has started can be marked complete.");
        closeOffer(application);
        audit.record(identities.currentUserId(), org, "interview.complete", "interview", interview);
    }

    private Interview confirm(UUID org, UUID application, UUID organizer, Instant startsAt, int minutes, String timezone,
                              String location, String message) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO application_interviews (id, application_id, created_by, starts_at, minutes, timezone, location, message) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, application, organizer, Timestamp.from(startsAt), minutes,
                timezone, location.trim(), message.trim());
        delivery.notifyCandidate(org, application, "Your interview is confirmed. Open Assessment & Interview for the details.");
        audit.record(identities.currentUserId(), org, "interview.schedule", "interview", id);
        return jdbc.queryForObject("SELECT * FROM application_interviews WHERE id = ?", InterviewService::map, id);
    }

    private void lockCalendars(UUID application, UUID organizer) {
        jdbc.query("SELECT id FROM users WHERE id = ? OR id = (SELECT candidate_user_id FROM applications WHERE id = ?) " +
                "ORDER BY id FOR NO KEY UPDATE", (rs, row) -> rs.getObject("id", UUID.class), organizer, application);
    }

    private boolean available(UUID application, UUID organizer, Instant startsAt, int minutes) {
        return !Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM application_interviews i JOIN applications a ON a.id = i.application_id
                WHERE i.cancelled_at IS NULL AND (i.created_by = ?
                    OR a.candidate_user_id = (SELECT candidate_user_id FROM applications WHERE id = ?))
                  AND i.starts_at < ? AND i.starts_at + i.minutes * INTERVAL '1 minute' > ?)
                """, Boolean.class, organizer, application, Timestamp.from(startsAt.plusSeconds(minutes * 60L)), Timestamp.from(startsAt)));
    }

    private Offer openOffer(UUID application) {
        var offers = jdbc.query("""
                SELECT id, organizer_id, minutes, timezone, location, message FROM interview_offers
                WHERE application_id = ? AND closed_at IS NULL
                """, (rs, row) -> new Offer(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getInt(3),
                rs.getString(4), rs.getString(5), rs.getString(6), List.of()), application);
        if (offers.isEmpty()) return null;
        Offer offer = offers.getFirst();
        var slots = jdbc.query("SELECT id, starts_at FROM interview_slots WHERE offer_id = ? ORDER BY starts_at",
                (rs, row) -> new Slot(rs.getObject(1, UUID.class), rs.getTimestamp(2).toInstant()), offer.id());
        return new Offer(offer.id(), offer.organizerId(), offer.minutes(), offer.timezone(), offer.location(), offer.message(), slots);
    }

    private void closeOffer(UUID application) {
        jdbc.update("UPDATE interview_offers SET closed_at = CURRENT_TIMESTAMP WHERE application_id = ? AND closed_at IS NULL", application);
    }

    private Interview activeInterview(UUID application) {
        return interviews(application).stream().filter(i -> i.cancelledAt() == null && i.completedAt() == null)
                .findFirst().orElse(null);
    }

    private void ensureNoInterview(UUID application) {
        if (activeInterview(application) != null) {
            throw conflict("Cancel or complete the current interview before scheduling another.");
        }
    }

    private static void requireInterviewStage(String status) {
        if (!List.of("IN_REVIEW", "INTERVIEW").contains(status)) {
            throw conflict("The application must be in review or interview.");
        }
    }

    private static void validateTime(Instant startsAt, String timezone) {
        if (!startsAt.isAfter(Instant.now())) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a future time.");
        try { ZoneId.of(timezone); }
        catch (DateTimeException ex) { throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a valid time zone."); }
    }

    private static ResponseStatusException conflict(String reason) {
        return new ResponseStatusException(HttpStatus.CONFLICT, reason);
    }

    @Transactional
    public void cancel(UUID org, UUID job, UUID application, UUID interview) {
        jobs.privateJob(org, job);
        requireApplication(application, "job_id", job, true);
        int changed = jdbc.update("UPDATE application_interviews SET cancelled_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND application_id = ? AND cancelled_at IS NULL AND completed_at IS NULL", interview, application);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Scheduled interview not found.");
        closeOffer(application);
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
                cancelled == null ? null : cancelled.toInstant(), rs.getInt("minutes"),
                time(rs, "reschedule_requested_at"), time(rs, "completed_at"));
    }

    private static Instant time(ResultSet rs, String column) throws SQLException {
        var timestamp = rs.getTimestamp(column);
        return timestamp == null ? null : timestamp.toInstant();
    }

    public record Interview(UUID id, Instant startsAt, String timezone, String location, String message,
                            Instant cancelledAt, int minutes, Instant rescheduleRequestedAt, Instant completedAt) {}
    public record Offer(UUID id, UUID organizerId, int minutes, String timezone, String location, String message, List<Slot> slots) {}
    public record Slot(UUID id, Instant startsAt) {}
}
