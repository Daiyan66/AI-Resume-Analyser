package com.airesume.ats.candidate;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
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
public class JobService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final OrganizationService organizations;
    private final AuditService audit;

    public JobService(JdbcTemplate jdbc, IdentityService identities, OrganizationService organizations, AuditService audit) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.organizations = organizations;
        this.audit = audit;
    }

    @Transactional
    public Job create(UUID organizationId, JobController.CreateJob request) {
        organizations.requireMember(organizationId);
        validateSalary(request);
        UUID id = UUID.randomUUID();
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO jobs (id, organization_id, created_by, title, location, work_type, " +
                        "salary_min, salary_max, currency, description, requirements) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, organizationId, actor, request.title().trim(), request.location().trim(), request.workType(),
                request.salaryMin(), request.salaryMax(), request.currency(), request.description().trim(),
                request.requirements().trim());
        saveQuestionsAndCriteria(id, request);
        audit.record(actor, organizationId, "job.create", "job", id);
        return privateJob(organizationId, id);
    }

    private void validateSalary(JobController.CreateJob request) {
        if ((request.salaryMin() == null) != (request.salaryMax() == null) ||
                (request.salaryMin() == null) != (request.currency() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both salary limits and a currency, or leave all three blank.");
        }
        if (request.salaryMin() != null && request.salaryMax() < request.salaryMin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum salary must be at least the minimum salary.");
        }
    }

    private void saveQuestionsAndCriteria(UUID id, JobController.CreateJob request) {
        int position = 0;
        for (JobController.QuestionInput question : request.questions()) {
            jdbc.update("INSERT INTO job_questions (id, job_id, position, prompt, required) VALUES (?, ?, ?, ?, ?)",
                    UUID.randomUUID(), id, position++, question.prompt().trim(), question.required());
        }
        position = 0;
        for (JobController.CriterionInput criterion : request.criteria()) {
            jdbc.update("INSERT INTO job_criteria (id, job_id, position, description, importance, guidance) " +
                            "VALUES (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), id, position++, criterion.description().trim(),
                    criterion.importance(), criterion.guidance() == null ? "" : criterion.guidance().trim());
        }
    }

    @Transactional
    public Job updateDraft(UUID organizationId, UUID jobId, JobController.CreateJob request) {
        organizations.requireMember(organizationId);
        validateSalary(request);
        int changed = jdbc.update("UPDATE jobs SET title = ?, location = ?, work_type = ?, salary_min = ?, salary_max = ?, " +
                        "currency = ?, description = ?, requirements = ?, updated_at = CURRENT_TIMESTAMP " +
                        "WHERE id = ? AND organization_id = ? AND status = 'DRAFT'", request.title().trim(),
                request.location().trim(), request.workType(), request.salaryMin(), request.salaryMax(), request.currency(),
                request.description().trim(), request.requirements().trim(), jobId, organizationId);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a draft job can be edited.");
        jdbc.update("DELETE FROM job_questions WHERE job_id = ?", jobId);
        jdbc.update("DELETE FROM job_criteria WHERE job_id = ?", jobId);
        saveQuestionsAndCriteria(jobId, request);
        audit.record(identities.currentUserId(), organizationId, "job.update", "job", jobId);
        return privateJob(organizationId, jobId);
    }

    @Transactional
    public Job changeStatus(UUID organizationId, UUID jobId, String status) {
        organizations.requireMember(organizationId);
        String from = switch (status) {
            case "PAUSED", "CLOSED" -> "PUBLISHED";
            case "PUBLISHED" -> "PAUSED";
            case "ARCHIVED" -> "CLOSED";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unsupported job status.");
        };
        int changed = jdbc.update("UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? " +
                "AND organization_id = ? AND status IN (?, ?)", status, jobId, organizationId, from,
                "CLOSED".equals(status) ? "PAUSED" : from);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "This job cannot move to " + status.toLowerCase() + " from its current status.");
        audit.record(identities.currentUserId(), organizationId, "job.status_" + status.toLowerCase(), "job", jobId);
        return privateJob(organizationId, jobId);
    }

    @Transactional
    public Job publish(UUID organizationId, UUID jobId) {
        organizations.requireMember(organizationId);
        Integer criteria = jdbc.queryForObject("SELECT count(*) FROM job_criteria WHERE job_id = ?", Integer.class, jobId);
        if (criteria != null && criteria == 0) {
            List<String> requirements = jdbc.query("SELECT requirements FROM jobs WHERE id = ? AND organization_id = ? " +
                    "AND status = 'DRAFT'", (rs, row) -> rs.getString("requirements"), jobId, organizationId);
            if (!requirements.isEmpty()) {
                jdbc.update("INSERT INTO job_criteria (id, job_id, position, description, importance, guidance) " +
                                "VALUES (?, ?, 0, 'Overall role requirements', 'REQUIRED', ?)",
                        UUID.randomUUID(), jobId, requirements.getFirst().substring(0, Math.min(1000, requirements.getFirst().length())));
            }
        }
        int changed = jdbc.update("UPDATE jobs SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP, published_by = ?, " +
                        "updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ? AND status = 'DRAFT'",
                identities.currentUserId(), jobId, organizationId);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a draft job can be published.");
        audit.record(identities.currentUserId(), organizationId, "job.publish", "job", jobId);
        return privateJob(organizationId, jobId);
    }

    public Page organizationJobs(UUID organizationId, int page, int size, String query, String status, String workType,
                                 UUID recruiterId, boolean excludeDrafts) {
        if (recruiterId == null) organizations.requireMember(organizationId);
        else organizations.requireAdmin(organizationId);
        String search = query.strip();
        String filter = " WHERE j.organization_id = ? AND (? = '' OR j.status = ?) AND (? = '' OR j.work_type = ?) " +
                "AND (? = '' OR strpos(lower(concat_ws(' ', j.title, j.location, j.description, j.requirements)), lower(?)) > 0) " +
                "AND (?::uuid IS NULL OR COALESCE(j.published_by, j.created_by) = ?) AND (NOT ? OR j.status <> 'DRAFT')";
        long total = jdbc.queryForObject("SELECT count(*) FROM jobs j" + filter, Long.class,
                organizationId, status, status, workType, workType, search, search, recruiterId, recruiterId, excludeDrafts);
        List<Job> items = jdbc.query(PRIVATE_JOB_SELECT + filter + " ORDER BY j.created_at DESC, j.id LIMIT ? OFFSET ?",
                (rs, row) -> map(rs, true), organizationId, status, status, workType, workType, search, search,
                recruiterId, recruiterId, excludeDrafts, size, (long) page * size);
        return new Page(items, page, size, total);
    }

    private static final String PRIVATE_JOB_SELECT = "SELECT j.*, o.name AS organization_name, u.display_name AS posted_by_name" +
            " FROM jobs j JOIN organizations o ON o.id = j.organization_id JOIN users u ON u.id = COALESCE(j.published_by, j.created_by)";

    public Job privateJob(UUID organizationId, UUID jobId) {
        organizations.requireMember(organizationId);
        List<Job> jobs = jdbc.query(PRIVATE_JOB_SELECT + " WHERE j.id = ? AND j.organization_id = ?", (rs, row) -> map(rs, true), jobId, organizationId);
        if (jobs.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found.");
        return jobs.getFirst();
    }

    public Job publicJob(UUID jobId) {
        List<Job> jobs = jdbc.query("SELECT j.*, o.name AS organization_name FROM jobs j JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE j.id = ? AND j.status = 'PUBLISHED'", (rs, row) -> map(rs, false), jobId);
        if (jobs.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Published job not found.");
        return jobs.getFirst();
    }

    public Page publicJobs(int page, int size, String query, String workType) {
        String search = query.strip();
        String work = workType == null ? "" : workType;
        String filter = " FROM jobs j JOIN organizations o ON o.id = j.organization_id WHERE j.status = 'PUBLISHED' " +
                "AND (j.work_type = ? OR ? = '') AND (? = '' OR strpos(lower(concat_ws(' ', j.title, j.location, " +
                "o.name, j.description, j.requirements)), lower(?)) > 0)";
        long total = jdbc.queryForObject("SELECT count(*)" + filter, Long.class, work, work, search, search);
        List<Job> jobs = jdbc.query("SELECT j.*, o.name AS organization_name" + filter +
                " ORDER BY j.published_at DESC, j.id LIMIT ? OFFSET ?", (rs, row) -> map(rs, false),
                work, work, search, search, size, (long) page * size);
        return new Page(jobs, page, size, total);
    }

    private Job map(ResultSet rs, boolean privateView) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Question> questions = jdbc.query("SELECT id, prompt, required FROM job_questions WHERE job_id = ? ORDER BY position",
                (row, position) -> new Question(row.getObject("id", UUID.class), row.getString("prompt"),
                        row.getBoolean("required")), id);
        List<Criterion> criteria = jdbc.query("SELECT id, description, importance, guidance FROM job_criteria " +
                        "WHERE job_id = ? ORDER BY position", (row, position) ->
                        new Criterion(row.getObject("id", UUID.class), row.getString("description"),
                                row.getString("importance"), privateView ? row.getString("guidance") : null), id);
        Integer min = rs.getObject("salary_min", Integer.class);
        Integer max = rs.getObject("salary_max", Integer.class);
        var published = rs.getTimestamp("published_at");
        return new Job(id, rs.getObject("organization_id", UUID.class), rs.getString("organization_name"),
                rs.getString("title"), rs.getString("location"), rs.getString("work_type"), min, max,
                rs.getString("currency"), rs.getString("description"), rs.getString("requirements"),
                rs.getString("status"), published == null ? null : published.toInstant(), questions, criteria,
                privateView ? rs.getString("posted_by_name") : null);
    }

    public record Question(UUID id, String prompt, boolean required) {}
    public record Criterion(UUID id, String description, String importance, String guidance) {}
    public record Job(UUID id, UUID organizationId, String organizationName, String title, String location,
                      String workType, Integer salaryMin, Integer salaryMax, String currency, String description,
                      String requirements, String status, Instant publishedAt, List<Question> questions,
                      List<Criterion> criteria, String postedByName) {}
    public record Page(List<Job> items, int page, int size, long total) {}
}
