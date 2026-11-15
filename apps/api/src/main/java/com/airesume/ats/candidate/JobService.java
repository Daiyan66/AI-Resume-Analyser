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
        if ((request.salaryMin() == null) != (request.salaryMax() == null) ||
                (request.salaryMin() == null) != (request.currency() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provide both salary limits and a currency, or leave all three blank.");
        }
        if (request.salaryMin() != null && request.salaryMax() < request.salaryMin()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum salary must be at least the minimum salary.");
        }
        UUID id = UUID.randomUUID();
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO jobs (id, organization_id, created_by, title, location, work_type, " +
                        "salary_min, salary_max, currency, description, requirements) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                id, organizationId, actor, request.title().trim(), request.location().trim(), request.workType(),
                request.salaryMin(), request.salaryMax(), request.currency(), request.description().trim(),
                request.requirements().trim());
        int position = 0;
        for (JobController.QuestionInput question : request.questions()) {
            jdbc.update("INSERT INTO job_questions (id, job_id, position, prompt, required) VALUES (?, ?, ?, ?, ?)",
                    UUID.randomUUID(), id, position++, question.prompt().trim(), question.required());
        }
        audit.record(actor, organizationId, "job.create", "job", id);
        return privateJob(organizationId, id);
    }

    @Transactional
    public Job publish(UUID organizationId, UUID jobId) {
        organizations.requireMember(organizationId);
        int changed = jdbc.update("UPDATE jobs SET status = 'PUBLISHED', published_at = CURRENT_TIMESTAMP, " +
                        "updated_at = CURRENT_TIMESTAMP WHERE id = ? AND organization_id = ? AND status = 'DRAFT'",
                jobId, organizationId);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Only a draft job can be published.");
        audit.record(identities.currentUserId(), organizationId, "job.publish", "job", jobId);
        return privateJob(organizationId, jobId);
    }

    public Page organizationJobs(UUID organizationId, int page, int size) {
        organizations.requireMember(organizationId);
        long total = jdbc.queryForObject("SELECT count(*) FROM jobs WHERE organization_id = ?", Long.class, organizationId);
        List<Job> items = jdbc.query("SELECT j.*, o.name AS organization_name FROM jobs j JOIN organizations o ON o.id = j.organization_id " +
                "WHERE j.organization_id = ? ORDER BY j.created_at DESC, j.id LIMIT ? OFFSET ?",
                (rs, row) -> map(rs), organizationId, size, (long) page * size);
        return new Page(items, page, size, total);
    }

    public Job privateJob(UUID organizationId, UUID jobId) {
        organizations.requireMember(organizationId);
        List<Job> jobs = jdbc.query("SELECT j.*, o.name AS organization_name FROM jobs j JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE j.id = ? AND j.organization_id = ?", (rs, row) -> map(rs), jobId, organizationId);
        if (jobs.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found.");
        return jobs.getFirst();
    }

    public Job publicJob(UUID jobId) {
        List<Job> jobs = jdbc.query("SELECT j.*, o.name AS organization_name FROM jobs j JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE j.id = ? AND j.status = 'PUBLISHED'", (rs, row) -> map(rs), jobId);
        if (jobs.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Published job not found.");
        return jobs.getFirst();
    }

    public Page publicJobs(int page, int size) {
        long total = jdbc.queryForObject("SELECT count(*) FROM jobs WHERE status = 'PUBLISHED'", Long.class);
        List<Job> jobs = jdbc.query("SELECT j.*, o.name AS organization_name FROM jobs j JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE j.status = 'PUBLISHED' ORDER BY j.published_at DESC, j.id LIMIT ? OFFSET ?",
                (rs, row) -> map(rs), size, (long) page * size);
        return new Page(jobs, page, size, total);
    }

    private Job map(ResultSet rs) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Question> questions = jdbc.query("SELECT id, prompt, required FROM job_questions WHERE job_id = ? ORDER BY position",
                (row, position) -> new Question(row.getObject("id", UUID.class), row.getString("prompt"),
                        row.getBoolean("required")), id);
        Integer min = rs.getObject("salary_min", Integer.class);
        Integer max = rs.getObject("salary_max", Integer.class);
        var published = rs.getTimestamp("published_at");
        return new Job(id, rs.getObject("organization_id", UUID.class), rs.getString("organization_name"),
                rs.getString("title"), rs.getString("location"), rs.getString("work_type"), min, max,
                rs.getString("currency"), rs.getString("description"), rs.getString("requirements"),
                rs.getString("status"), published == null ? null : published.toInstant(), questions);
    }

    public record Question(UUID id, String prompt, boolean required) {}
    public record Job(UUID id, UUID organizationId, String organizationName, String title, String location,
                      String workType, Integer salaryMin, Integer salaryMax, String currency, String description,
                      String requirements, String status, Instant publishedAt, List<Question> questions) {}
    public record Page(List<Job> items, int page, int size, long total) {}
}
