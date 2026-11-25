package com.airesume.ats.workflow;

import com.airesume.ats.candidate.JobService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AssessmentService {
    private static final String CONTEXT = """
            SELECT a.status, a.candidate_user_id, a.job_id, j.organization_id
              FROM applications a JOIN jobs j ON j.id = a.job_id WHERE a.id = ?
            """;
    private static final String ASSIGNMENTS = """
            SELECT s.*, t.title, t.instructions, t.effort_minutes, t.allowed_tools, t.rubric,
                   d.original_filename
              FROM assessment_assignments s JOIN assessment_templates t ON t.id = s.template_id
              LEFT JOIN documents d ON d.id = s.document_id
            """;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;
    private final JobService jobs;
    private final OrganizationService organizations;
    private final IdentityService identities;
    private final DeliveryService delivery;
    private final AuditService audit;

    public AssessmentService(JdbcTemplate jdbc, ObjectMapper json, JobService jobs, OrganizationService organizations,
                             IdentityService identities, DeliveryService delivery, AuditService audit) {
        this.jdbc = jdbc;
        this.json = json;
        this.jobs = jobs;
        this.organizations = organizations;
        this.identities = identities;
        this.delivery = delivery;
        this.audit = audit;
    }

    public List<Template> templates(UUID org, UUID job, int page) {
        jobs.privateJob(org, job);
        return jdbc.query("SELECT * FROM assessment_templates WHERE job_id = ? ORDER BY created_at DESC, id LIMIT 20 OFFSET ?",
                this::mapTemplate, job, page * 20L);
    }

    @Transactional
    public Template saveTemplate(UUID org, UUID job, UUID id, TemplateInput input) {
        jobs.privateJob(org, job);
        var rubric = input.rubric().stream().map(String::trim).toList();
        if (rubric.stream().distinct().count() != rubric.size()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Each rubric criterion must be distinct.");
        }
        if (id == null) {
            id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO assessment_templates(id, job_id, created_by, title, instructions, effort_minutes, allowed_tools, rubric)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?::jsonb)
                    """, id, job, identities.currentUserId(), input.title().trim(), input.instructions().trim(),
                    input.effortMinutes(), input.allowedTools().trim(), encode(rubric));
        } else {
            int changed = jdbc.update("""
                    UPDATE assessment_templates SET title = ?, instructions = ?, effort_minutes = ?, allowed_tools = ?, rubric = ?::jsonb
                    WHERE id = ? AND job_id = ? AND published_at IS NULL
                    """, input.title().trim(), input.instructions().trim(), input.effortMinutes(), input.allowedTools().trim(),
                    encode(rubric), id, job);
            if (changed != 1) throw conflict("Only an unpublished assessment draft can be edited.");
        }
        return template(job, id);
    }

    @Transactional
    public Template publish(UUID org, UUID job, UUID id) {
        jobs.privateJob(org, job);
        int changed = jdbc.update("UPDATE assessment_templates SET published_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND job_id = ? AND published_at IS NULL", id, job);
        if (changed == 1) audit.record(identities.currentUserId(), org, "assessment.publish", "assessment_template", id);
        return template(job, id);
    }

    public List<Assignment> candidateAssignments(UUID application) {
        candidateContext(application, false);
        Instant now = Instant.now();
        return assignments(application).stream().map(assignment ->
                assignment.availableFrom().isAfter(now) ? candidateBeforeStart(assignment) : assignment).toList();
    }

    public List<Assignment> staffAssignments(UUID org, UUID application) {
        staffContext(org, application, false);
        return assignments(application).stream().map(AssessmentService::hideDraft).toList();
    }

    @Transactional
    public Assignment assign(UUID org, UUID application, UUID templateId, Instant availableFrom, Instant dueAt) {
        Context context = staffContext(org, application, true);
        if (!List.of("SUBMITTED", "IN_REVIEW").contains(context.status())) {
            throw conflict("Assign assessments before moving the application to interview.");
        }
        Instant now = Instant.now();
        if (availableFrom != null && availableFrom.isBefore(now)) {
            throw bad("Choose a future opening time or leave it blank to start now.");
        }
        Instant starts = availableFrom == null ? now : availableFrom;
        if (!dueAt.isAfter(starts)) throw bad("Choose a future deadline after the assessment opens.");
        if (template(context.job(), templateId).publishedAt() == null) throw conflict("Publish the assessment before assigning it.");
        if (Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM application_interviews WHERE application_id = ?
                  AND cancelled_at IS NULL AND completed_at IS NULL)
                """, Boolean.class, application))) throw conflict("This application already has a confirmed interview.");

        // A missed deadline can be assigned again. Keep the first attempt in the candidate's history.
        jdbc.update("""
                UPDATE assessment_assignments SET outcome = 'EXPIRED' WHERE application_id = ? AND template_id = ?
                  AND submitted_at IS NULL AND outcome IS NULL AND due_at <= CURRENT_TIMESTAMP
                """, application, templateId);
        UUID id = UUID.randomUUID();
        int changed = jdbc.update("""
                INSERT INTO assessment_assignments(id, application_id, template_id, available_from, due_at)
                VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING
                """, id, application, templateId, Timestamp.from(starts), Timestamp.from(dueAt));
        if (changed != 1) throw conflict("This assessment is already assigned or passed.");
        UUID actor = identities.currentUserId();
        if ("SUBMITTED".equals(context.status())) {
            jdbc.update("UPDATE applications SET status = 'IN_REVIEW' WHERE id = ?", application);
            jdbc.update("INSERT INTO application_events(id, application_id, actor_user_id, status, message) " +
                    "VALUES (?, ?, ?, 'IN_REVIEW', 'Assessment assigned')", UUID.randomUUID(), application, actor);
        }
        jdbc.update("UPDATE interview_offers SET closed_at = CURRENT_TIMESTAMP WHERE application_id = ? AND closed_at IS NULL",
                application);
        audit.record(actor, org, "assessment.assign", "assessment", id);
        delivery.notifyCandidate(org, application, "An assessment was assigned. Check the opening time and deadline in Assessment & Interview.");
        return findAssignment(application, id);
    }

    @Transactional
    public Assignment save(UUID application, UUID id, Response input, boolean submit) {
        Context context = candidateContext(application, true);
        requireActive(context);
        Assignment existing = findAssignment(application, id);
        if (existing.submittedAt() != null) throw conflict("This assessment has already been submitted.");
        Instant now = Instant.now();
        if (existing.availableFrom().isAfter(now)) throw conflict("This assessment has not opened yet.");
        if (!existing.dueAt().isAfter(now)) throw conflict("The assessment deadline has passed.");
        String answer = input.answer().strip();
        if (submit && answer.isBlank() && input.documentId() == null) throw bad("Enter an answer or attach a file before submitting.");
        if (input.documentId() != null && jdbc.query(
                "SELECT id FROM documents WHERE id = ? AND owner_user_id = ? FOR SHARE",
                (rs, row) -> rs.getObject(1, UUID.class), input.documentId(), context.candidate()).isEmpty()) {
            throw notFound("Attachment not found in your documents.");
        }
        jdbc.update("""
                UPDATE assessment_assignments SET answer = ?, document_id = ?, ai_consent = ?, updated_at = CURRENT_TIMESTAMP,
                  submitted_at = CASE WHEN ? THEN CURRENT_TIMESTAMP ELSE NULL END WHERE id = ?
                """, answer, input.documentId(), input.aiConsent(), submit, id);
        if (submit) audit.record(context.candidate(), context.org(), "assessment.submit", "assessment", id);
        return findAssignment(application, id);
    }

    @Transactional
    public Assignment review(UUID org, UUID application, UUID id, Review input) {
        staffContext(org, application, true);
        Assignment assignment = findAssignment(application, id);
        if (assignment.submittedAt() == null || assignment.outcome() != null) throw conflict("This assessment needs a submission with no recorded outcome.");
        if (input.scores().size() != assignment.rubric().size()) throw bad("Record a score for every criterion.");
        jdbc.update("""
                UPDATE assessment_assignments SET scores = ?::jsonb, feedback = ?, reviewed_at = CURRENT_TIMESTAMP,
                  reviewed_by = ?, outcome = ? WHERE id = ?
                """, encode(input.scores()), input.feedback().trim(), identities.currentUserId(), input.outcome().name(), id);
        audit.record(identities.currentUserId(), org, "assessment.review", "assessment", id);
        delivery.notifyCandidate(org, application, input.outcome() == Outcome.PASSED
                ? "You passed an assessment. Review your feedback in Assessment & Interview."
                : "Your recruiter requested another assessment attempt. Review the feedback in Assessment & Interview.");
        return findAssignment(application, id);
    }

    public Assignment forEvidence(UUID org, UUID application, UUID id) {
        staffContext(org, application, false);
        var result = findAssignment(application, id);
        if (result.submittedAt() == null || !result.aiConsent()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "AI review requires a submitted assessment and the candidate’s permission.");
        }
        if (result.answer().isBlank()) throw bad("AI evidence review is available for written answers.");
        return result;
    }

    public PracticeSource practiceSource(UUID application) {
        Context context = candidateContext(application, false);
        return jdbc.queryForObject("SELECT title, description, requirements FROM jobs WHERE id = ?",
                (rs, row) -> new PracticeSource(context.org(), rs.getString(1), rs.getString(2), rs.getString(3)), context.job());
    }

    public List<String> practice(UUID application) {
        PracticeSource role = practiceSource(application);
        return List.of("Describe a project relevant to the " + role.title() + " role. Explain your contribution and its outcome.",
                "Pick a requirement from the job description and explain how you would demonstrate it.",
                "Describe a trade-off you faced in similar work. How did you test your decision?");
    }

    private List<Assignment> assignments(UUID application) {
        return jdbc.query(ASSIGNMENTS + " WHERE s.application_id = ? ORDER BY s.assigned_at DESC, s.id DESC", this::mapAssignment, application);
    }

    private Assignment findAssignment(UUID application, UUID id) {
        return jdbc.query(ASSIGNMENTS + " WHERE s.application_id = ? AND s.id = ?", this::mapAssignment, application, id)
                .stream().findFirst().orElseThrow(() -> notFound("Assessment not found."));
    }

    private Template template(UUID job, UUID id) {
        return jdbc.query("SELECT * FROM assessment_templates WHERE job_id = ? AND id = ?", this::mapTemplate, job, id)
                .stream().findFirst().orElseThrow(() -> notFound("Assessment template not found."));
    }

    private Context candidateContext(UUID application, boolean lock) {
        return context(application, " AND a.candidate_user_id = ?", identities.currentUserId(), lock);
    }

    private Context staffContext(UUID org, UUID application, boolean lock) {
        organizations.requireMember(org);
        return context(application, " AND j.organization_id = ?", org, lock);
    }

    private Context context(UUID application, String predicate, UUID owner, boolean lock) {
        return jdbc.query(CONTEXT + predicate + (lock ? " FOR UPDATE OF a" : ""),
                (rs, row) -> new Context(rs.getString(1), rs.getObject(2, UUID.class), rs.getObject(3, UUID.class),
                        rs.getObject(4, UUID.class)), application, owner).stream().findFirst()
                .orElseThrow(() -> notFound("Application not found."));
    }

    private static void requireActive(Context context) {
        if (List.of("HIRED", "NOT_SELECTED", "WITHDRAWN").contains(context.status())) {
            throw conflict("This application is closed.");
        }
    }

    private Template mapTemplate(ResultSet rs, int row) throws SQLException {
        return new Template(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("instructions"),
                rs.getInt("effort_minutes"), rs.getString("allowed_tools"), decode(rs.getString("rubric"), new TypeReference<>() {}),
                time(rs, "published_at"));
    }

    private Assignment mapAssignment(ResultSet rs, int row) throws SQLException {
        return new Assignment(rs.getObject("id", UUID.class), rs.getObject("template_id", UUID.class), rs.getString("title"), rs.getString("instructions"),
                rs.getInt("effort_minutes"), rs.getString("allowed_tools"), decode(rs.getString("rubric"), new TypeReference<>() {}),
                time(rs, "available_from"), time(rs, "due_at"), rs.getString("answer"), rs.getObject("document_id", UUID.class),
                rs.getString("original_filename"), rs.getBoolean("ai_consent"), time(rs, "updated_at"),
                time(rs, "submitted_at"), time(rs, "reviewed_at"), decode(rs.getString("scores"), new TypeReference<>() {}),
                rs.getString("feedback"), rs.getString("outcome"));
    }

    private static Assignment hideDraft(Assignment a) {
        return a.submittedAt() != null ? a : new Assignment(a.id(), a.templateId(), a.title(), a.instructions(), a.effortMinutes(),
                a.allowedTools(), a.rubric(), a.availableFrom(), a.dueAt(), "", null, null, false, null, null, null, List.of(), null, a.outcome());
    }

    private static Assignment candidateBeforeStart(Assignment a) {
        return new Assignment(a.id(), a.templateId(), a.title(), "", a.effortMinutes(), a.allowedTools(), List.of(),
                a.availableFrom(), a.dueAt(), "", null, null, false, null, null, null, List.of(), null, a.outcome());
    }

    private static Instant time(ResultSet rs, String column) throws SQLException {
        var value = rs.getTimestamp(column);
        return value == null ? null : value.toInstant();
    }

    private String encode(List<?> value) {
        try { return json.writeValueAsString(value); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Invalid assessment data", e); }
    }

    private <T> List<T> decode(String value, TypeReference<List<T>> type) {
        if (value == null) return List.of();
        try { return json.readValue(value, type); }
        catch (JsonProcessingException e) { throw new IllegalStateException("Invalid assessment data", e); }
    }

    private static ResponseStatusException bad(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private static ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
    private static ResponseStatusException conflict(String message) { return new ResponseStatusException(HttpStatus.CONFLICT, message); }

    private record Context(String status, UUID candidate, UUID job, UUID org) {}
    public record PracticeSource(UUID organizationId, String title, String description, String requirements) {}
    public record TemplateInput(@NotBlank @Size(max = 160) String title, @NotBlank @Size(max = 12000) String instructions,
                                @Min(5) @Max(480) int effortMinutes, @NotBlank @Size(max = 1000) String allowedTools,
                                @NotNull @Size(min = 1, max = 10) List<@NotBlank @Size(max = 500) String> rubric) {}
    public record Template(UUID id, String title, String instructions, int effortMinutes, String allowedTools,
                           List<String> rubric, Instant publishedAt) {}
    public record Response(@NotNull @Size(max = 20000) String answer, UUID documentId, boolean aiConsent) {}
    public enum Outcome { PASSED, RETRY }
    public record Review(@NotNull @Size(min = 1, max = 10) List<@NotNull @Min(0) @Max(4) Integer> scores,
                         @NotBlank @Size(max = 4000) String feedback, @NotNull Outcome outcome) {}
    public record Assignment(UUID id, UUID templateId, String title, String instructions, int effortMinutes, String allowedTools, List<String> rubric,
                             Instant availableFrom, Instant dueAt, String answer, UUID documentId, String documentName, boolean aiConsent,
                             Instant updatedAt, Instant submittedAt, Instant reviewedAt, List<Integer> scores, String feedback, String outcome) {}
}
