package com.airesume.ats.recruiter;

import com.airesume.ats.candidate.JobService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class RecruiterService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final OrganizationService organizations;
    private final JobService jobs;
    private final AuditService audit;
    private final ObjectMapper json;

    public RecruiterService(JdbcTemplate jdbc, IdentityService identities, OrganizationService organizations,
                            JobService jobs, AuditService audit, ObjectMapper json) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.organizations = organizations;
        this.jobs = jobs;
        this.audit = audit;
        this.json = json;
    }

    public Page pipeline(UUID organizationId, UUID jobId, int page, int size) {
        jobs.privateJob(organizationId, jobId);
        long total = jdbc.queryForObject("SELECT count(*) FROM applications WHERE job_id = ?", Long.class, jobId);
        List<PipelineItem> items = jdbc.query("SELECT a.id, a.status, a.submitted_at, " +
                        "a.profile_snapshot->>'displayName' AS candidate_name, " +
                        "a.profile_snapshot->>'email' AS candidate_email, " +
                        "(SELECT count(DISTINCT r.criterion_id) FROM application_reviews r WHERE r.application_id = a.id) AS reviewed, " +
                        "(SELECT count(*) FROM job_criteria c WHERE c.job_id = a.job_id) AS criteria_total " +
                        "FROM applications a WHERE a.job_id = ? ORDER BY a.submitted_at DESC, a.id LIMIT ? OFFSET ?",
                (rs, row) -> new PipelineItem(rs.getObject("id", UUID.class), rs.getString("candidate_name"),
                        rs.getString("candidate_email"), rs.getString("status"), rs.getTimestamp("submitted_at").toInstant(),
                        rs.getInt("reviewed"), rs.getInt("criteria_total")), jobId, size, (long) page * size);
        return new Page(items, page, size, total);
    }

    public Detail detail(UUID organizationId, UUID jobId, UUID applicationId) {
        JobService.Job job = jobs.privateJob(organizationId, jobId);
        List<Detail> details = jdbc.query("SELECT a.id, a.status, a.submitted_at, a.profile_snapshot, a.answers, " +
                        "a.document_id, d.original_filename AS document_name FROM applications a " +
                        "LEFT JOIN documents d ON d.id = a.document_id WHERE a.id = ? AND a.job_id = ?",
                (rs, row) -> mapDetail(rs, job), applicationId, jobId);
        if (details.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found.");
        audit.record(identities.currentUserId(), organizationId, "application.review_view", "application", applicationId);
        return details.getFirst();
    }

    @Transactional
    public Review review(UUID organizationId, UUID jobId, UUID applicationId, UUID criterionId,
                         String rating, String note) {
        JobService.Job job = jobs.privateJob(organizationId, jobId);
        if (job.criteria().stream().noneMatch(criterion -> criterion.id().equals(criterionId))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a criterion from this job.");
        }
        String current = lockedStatus(jobId, applicationId);
        if (List.of("HIRED", "NOT_SELECTED", "WITHDRAWN").contains(current)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed applications cannot be reviewed.");
        }
        UUID id = UUID.randomUUID();
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO application_reviews (id, application_id, criterion_id, reviewer_user_id, rating, note) " +
                "VALUES (?, ?, ?, ?, ?, ?)", id, applicationId, criterionId, actor, rating, note.trim());
        audit.record(actor, organizationId, "application.review_record", "application", applicationId);
        return reviewById(id);
    }

    @Transactional
    public Detail advance(UUID organizationId, UUID jobId, UUID applicationId, String target) {
        jobs.privateJob(organizationId, jobId);
        String current = lockedStatus(jobId, applicationId);
        boolean allowed = ("SUBMITTED".equals(current) && "IN_REVIEW".equals(target)) ||
                ("IN_REVIEW".equals(current) && "INTERVIEW".equals(target)) ||
                ("INTERVIEW".equals(current) && "OFFER".equals(target));
        if (!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This application cannot move from " + current + " to " + target + ".");
        jdbc.update("UPDATE applications SET status = ? WHERE id = ?", target, applicationId);
        UUID actor = identities.currentUserId();
        String label = switch (target) { case "IN_REVIEW" -> "In review"; case "INTERVIEW" -> "Interview";
            default -> "Offer"; };
        jdbc.update("INSERT INTO application_events (id, application_id, actor_user_id, status, message) " +
                "VALUES (?, ?, ?, ?, ?)", UUID.randomUUID(), applicationId, actor, target, label);
        audit.record(actor, organizationId, "application.stage_" + target.toLowerCase(), "application", applicationId);
        return detail(organizationId, jobId, applicationId);
    }

    @Transactional
    public Detail decide(UUID organizationId, UUID jobId, UUID applicationId, String outcome, String reason) {
        JobService.Job job = jobs.privateJob(organizationId, jobId);
        String current = lockedStatus(jobId, applicationId);
        boolean allowed = "HIRED".equals(outcome) ? "OFFER".equals(current) :
                List.of("IN_REVIEW", "INTERVIEW", "OFFER").contains(current);
        if (!allowed) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Move the application through review before recording this decision.");
        Integer covered = jdbc.queryForObject("SELECT count(DISTINCT r.criterion_id) FROM application_reviews r " +
                "JOIN job_criteria c ON c.id = r.criterion_id WHERE r.application_id = ? AND c.job_id = ?",
                Integer.class, applicationId, jobId);
        if (job.criteria().isEmpty() || covered == null || covered < job.criteria().size()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Record a human review for every job criterion before deciding.");
        }
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO application_decisions (id, application_id, actor_user_id, outcome, reason) " +
                "VALUES (?, ?, ?, ?, ?)", UUID.randomUUID(), applicationId, actor, outcome, reason.trim());
        jdbc.update("UPDATE applications SET status = ? WHERE id = ?", outcome, applicationId);
        jdbc.update("INSERT INTO application_events (id, application_id, actor_user_id, status, message) " +
                "VALUES (?, ?, ?, ?, ?)", UUID.randomUUID(), applicationId, actor, outcome,
                "HIRED".equals(outcome) ? "Hired" : "Not selected");
        audit.record(actor, organizationId, "application.decision_" + outcome.toLowerCase(), "application", applicationId);
        return detail(organizationId, jobId, applicationId);
    }

    private String lockedStatus(UUID jobId, UUID applicationId) {
        List<String> statuses = jdbc.query("SELECT status FROM applications WHERE id = ? AND job_id = ? FOR UPDATE",
                (rs, row) -> rs.getString("status"), applicationId, jobId);
        if (statuses.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found.");
        return statuses.getFirst();
    }

    private Review reviewById(UUID id) {
        return jdbc.queryForObject("SELECT r.*, u.display_name AS reviewer_name FROM application_reviews r " +
                        "JOIN users u ON u.id = r.reviewer_user_id WHERE r.id = ?",
                (rs, row) -> mapReview(rs), id);
    }

    private Detail mapDetail(ResultSet rs, JobService.Job job) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Review> reviews = jdbc.query("SELECT r.*, u.display_name AS reviewer_name FROM application_reviews r " +
                        "JOIN users u ON u.id = r.reviewer_user_id WHERE r.application_id = ? " +
                        "ORDER BY r.created_at DESC, r.id", (row, number) -> mapReview(row), id);
        List<Decision> decisions = jdbc.query("SELECT d.*, u.display_name AS actor_name FROM application_decisions d " +
                        "JOIN users u ON u.id = d.actor_user_id WHERE d.application_id = ? ORDER BY d.created_at",
                (row, number) -> new Decision(row.getObject("id", UUID.class), row.getString("actor_name"),
                        row.getString("outcome"), row.getString("reason"), row.getTimestamp("created_at").toInstant()), id);
        List<StageEvent> events = jdbc.query("SELECT status, message, created_at FROM application_events " +
                        "WHERE application_id = ? ORDER BY created_at, id",
                (row, number) -> new StageEvent(row.getString("status"), row.getString("message"),
                        row.getTimestamp("created_at").toInstant()), id);
        return new Detail(id, job, rs.getString("status"), parse(rs.getString("profile_snapshot")),
                parse(rs.getString("answers")), rs.getObject("document_id", UUID.class),
                rs.getString("document_name"), rs.getTimestamp("submitted_at").toInstant(), reviews, decisions, events);
    }

    private Review mapReview(ResultSet rs) throws SQLException {
        return new Review(rs.getObject("id", UUID.class), rs.getObject("criterion_id", UUID.class),
                rs.getString("reviewer_name"), rs.getString("rating"), rs.getString("note"),
                rs.getTimestamp("created_at").toInstant());
    }

    private JsonNode parse(String value) {
        try { return json.readTree(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored application JSON is invalid", exception); }
    }

    public record PipelineItem(UUID id, String candidateName, String candidateEmail, String status,
                               Instant submittedAt, int reviewedCriteria, int totalCriteria) {}
    public record Page(List<PipelineItem> items, int page, int size, long total) {}
    public record Review(UUID id, UUID criterionId, String reviewerName, String rating, String note, Instant createdAt) {}
    public record Decision(UUID id, String actorName, String outcome, String reason, Instant createdAt) {}
    public record StageEvent(String status, String message, Instant createdAt) {}
    public record Detail(UUID id, JobService.Job job, String status, JsonNode profileSnapshot, JsonNode answers,
                         UUID documentId, String documentName, Instant submittedAt, List<Review> reviews,
                         List<Decision> decisions, List<StageEvent> events) {}
}
