package com.airesume.ats.candidate;

import com.airesume.ats.documents.DocumentService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.security.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class CandidateService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final JobService jobs;
    private final DocumentService documents;
    private final AuditService audit;
    private final ObjectMapper json;

    public CandidateService(JdbcTemplate jdbc, IdentityService identities, JobService jobs,
                            DocumentService documents, AuditService audit, ObjectMapper json) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.jobs = jobs;
        this.documents = documents;
        this.audit = audit;
        this.json = json;
    }

    public Profile profile() {
        List<Profile> profiles = jdbc.query("SELECT headline, location, phone, summary, skills, experience, education " +
                        "FROM candidate_profiles WHERE user_id = ?", (rs, row) -> new Profile(rs.getString("headline"),
                rs.getString("location"), rs.getString("phone"), rs.getString("summary"), rs.getString("skills"),
                rs.getString("experience"), rs.getString("education")), identities.currentUserId());
        return profiles.isEmpty() ? new Profile("", "", "", "", "", "", "") : profiles.getFirst();
    }

    @Transactional
    public Profile saveProfile(Profile input) {
        UUID userId = identities.currentUserId();
        jdbc.update("INSERT INTO candidate_profiles (user_id, headline, location, phone, summary, skills, experience, education) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (user_id) DO UPDATE SET headline = EXCLUDED.headline, " +
                        "location = EXCLUDED.location, phone = EXCLUDED.phone, summary = EXCLUDED.summary, " +
                        "skills = EXCLUDED.skills, experience = EXCLUDED.experience, education = EXCLUDED.education, " +
                        "updated_at = CURRENT_TIMESTAMP", userId, input.headline().trim(), input.location().trim(),
                input.phone().trim(), input.summary().trim(), input.skills().trim(), input.experience().trim(),
                input.education().trim());
        audit.record(userId, null, "candidate.profile_update", "user", userId);
        return profile();
    }

    @Transactional
    public Application submit(UUID jobId, UUID documentId, Map<UUID, String> answers) {
        UUID candidateId = identities.currentUserId();
        JobService.Job job = jobs.publicJob(jobId);
        List<String> jobStatuses = jdbc.query("SELECT status FROM jobs WHERE id = ? FOR SHARE",
                (rs, row) -> rs.getString("status"), jobId);
        if (jobStatuses.isEmpty() || !"PUBLISHED".equals(jobStatuses.getFirst())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This job is no longer accepting applications.");
        }
        Integer cooldown = jdbc.queryForObject("SELECT reapply_cooldown_days FROM organization_policies " +
                "WHERE organization_id = ?", Integer.class, job.organizationId());
        if (cooldown != null && cooldown > 0) {
            Integer recentClosure = jdbc.queryForObject("SELECT count(*) FROM applications a JOIN application_events e " +
                    "ON e.application_id = a.id WHERE a.job_id = ? AND a.candidate_user_id = ? " +
                    "AND e.status IN ('HIRED', 'NOT_SELECTED', 'WITHDRAWN') " +
                    "AND e.created_at > CURRENT_TIMESTAMP - (? * INTERVAL '1 day')", Integer.class,
                    jobId, candidateId, cooldown);
            if (recentClosure != null && recentClosure > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "This organization requires " + cooldown + " days before reapplying to this job.");
            }
        }
        if (documentId != null) {
            Integer count = jdbc.queryForObject("SELECT count(*) FROM documents WHERE id = ? AND owner_user_id = ?",
                    Integer.class, documentId, candidateId);
            if (count == null || count == 0) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose one of your own documents.");
        }
        Map<UUID, String> submittedAnswers = answers == null ? Map.of() : answers;
        for (JobService.Question question : job.questions()) {
            String answer = submittedAnswers.get(question.id());
            if (question.required() && (answer == null || answer.isBlank())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Answer every required job question.");
            }
        }
        if (submittedAnswers.size() > job.questions().size() ||
                submittedAnswers.keySet().stream().anyMatch(id -> job.questions().stream().noneMatch(q -> q.id().equals(id))) ||
                submittedAnswers.values().stream().anyMatch(value -> value == null || value.length() > 2000)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Check the job question answers (maximum 2,000 characters each).");
        }
        Profile currentProfile = profile();
        if (currentProfile.headline().isBlank() || currentProfile.summary().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Add a headline and summary to your candidate profile before applying.");
        }
        IdentityService.Account account = identities.currentAccount();
        Map<String, Object> snapshot = new HashMap<>();
        snapshot.put("displayName", account.displayName());
        snapshot.put("email", account.email());
        snapshot.put("profile", currentProfile);
        Map<String, Answer> answerSnapshot = new HashMap<>();
        for (JobService.Question question : job.questions()) {
            answerSnapshot.put(question.id().toString(), new Answer(question.prompt(),
                    submittedAnswers.getOrDefault(question.id(), "")));
        }
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO applications (id, job_id, candidate_user_id, document_id, profile_snapshot, answers) " +
                            "VALUES (?, ?, ?, ?, ?::jsonb, ?::jsonb)", id, jobId, candidateId, documentId,
                    json.valueToTree(snapshot).toString(), json.valueToTree(answerSnapshot).toString());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have an active application for this job.");
        }
        addEvent(id, candidateId, "SUBMITTED", "Application received");
        audit.record(candidateId, job.organizationId(), "application.submit", "application", id);
        return application(id);
    }

    public Application application(UUID id) {
        List<Application> applications = jdbc.query("SELECT a.*, j.title AS job_title, o.name AS organization_name " +
                        "FROM applications a JOIN jobs j ON j.id = a.job_id JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE a.id = ? AND a.candidate_user_id = ?", (rs, row) -> map(rs), id, identities.currentUserId());
        if (applications.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application not found.");
        return applications.getFirst();
    }

    public Page applications(int page, int size) {
        UUID userId = identities.currentUserId();
        long total = jdbc.queryForObject("SELECT count(*) FROM applications WHERE candidate_user_id = ?", Long.class, userId);
        List<Application> items = jdbc.query("SELECT a.*, j.title AS job_title, o.name AS organization_name " +
                        "FROM applications a JOIN jobs j ON j.id = a.job_id JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE a.candidate_user_id = ? ORDER BY a.submitted_at DESC, a.id LIMIT ? OFFSET ?",
                (rs, row) -> map(rs), userId, size, (long) page * size);
        return new Page(items, page, size, total);
    }

    @Transactional
    public Application withdraw(UUID id) {
        Application current = application(id);
        if (List.of("WITHDRAWN", "HIRED", "NOT_SELECTED").contains(current.status())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This application is already closed.");
        }
        int changed = jdbc.update("UPDATE applications SET status = 'WITHDRAWN', withdrawn_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND candidate_user_id = ? AND status IN ('SUBMITTED', 'IN_REVIEW', 'INTERVIEW', 'OFFER')",
                id, identities.currentUserId());
        if (changed != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "This application is already closed.");
        addEvent(id, identities.currentUserId(), "WITHDRAWN", "You withdrew this application");
        UUID orgId = jdbc.queryForObject("SELECT organization_id FROM jobs WHERE id = ?", UUID.class, current.jobId());
        audit.record(identities.currentUserId(), orgId, "application.withdraw", "application", id);
        return application(id);
    }

    public Map<String, Object> export() {
        UUID userId = identities.currentUserId();
        List<Application> all = jdbc.query("SELECT a.*, j.title AS job_title, o.name AS organization_name " +
                        "FROM applications a JOIN jobs j ON j.id = a.job_id JOIN organizations o ON o.id = j.organization_id " +
                        "WHERE a.candidate_user_id = ? ORDER BY a.submitted_at, a.id", (rs, row) -> map(rs), userId);
        return Map.of("account", identities.currentAccount(), "profile", profile(),
                "documents", documents.mine(), "applications", all);
    }

    @Transactional
    public DataRequest requestDeletion() {
        UUID userId = identities.currentUserId();
        List<DataRequest> existing = jdbc.query("SELECT id, status, created_at FROM candidate_data_requests " +
                        "WHERE user_id = ? AND status = 'PENDING' ORDER BY created_at DESC LIMIT 1",
                (rs, row) -> new DataRequest(rs.getObject("id", UUID.class), rs.getString("status"),
                        rs.getTimestamp("created_at").toInstant()), userId);
        if (!existing.isEmpty()) return existing.getFirst();
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO candidate_data_requests (id, user_id, request_type) VALUES (?, ?, 'DELETE')", id, userId);
        audit.record(userId, null, "candidate.deletion_requested", "data_request", id);
        return dataRequests().getFirst();
    }

    public List<DataRequest> dataRequests() {
        return jdbc.query("SELECT id, status, created_at FROM candidate_data_requests WHERE user_id = ? " +
                        "ORDER BY created_at DESC LIMIT 20", (rs, row) -> new DataRequest(rs.getObject("id", UUID.class),
                rs.getString("status"), rs.getTimestamp("created_at").toInstant()), identities.currentUserId());
    }

    private void addEvent(UUID applicationId, UUID actor, String status, String message) {
        jdbc.update("INSERT INTO application_events (id, application_id, actor_user_id, status, message) " +
                "VALUES (?, ?, ?, ?, ?)", UUID.randomUUID(), applicationId, actor, status, message);
    }

    private Application map(ResultSet rs) throws SQLException {
        UUID id = rs.getObject("id", UUID.class);
        List<Event> events = jdbc.query("SELECT id, status, message, created_at FROM application_events " +
                        "WHERE application_id = ? ORDER BY created_at, id", (row, number) ->
                        new Event(row.getObject("id", UUID.class), row.getString("status"), row.getString("message"),
                                row.getTimestamp("created_at").toInstant()), id);
        return new Application(id, rs.getObject("job_id", UUID.class), rs.getString("job_title"),
                rs.getString("organization_name"), rs.getString("status"),
                rs.getObject("document_id", UUID.class), parse(rs.getString("profile_snapshot")),
                parse(rs.getString("answers")), rs.getTimestamp("submitted_at").toInstant(), events);
    }

    private JsonNode parse(String value) {
        try { return json.readTree(value); }
        catch (JsonProcessingException exception) { throw new IllegalStateException("Stored application JSON is invalid", exception); }
    }

    public record Profile(@NotNull @Size(max = 160) String headline,
                          @NotNull @Size(max = 160) String location,
                          @NotNull @Size(max = 40) String phone,
                          @NotNull @Size(max = 4000) String summary,
                          @NotNull @Size(max = 4000) String skills,
                          @NotNull @Size(max = 8000) String experience,
                          @NotNull @Size(max = 4000) String education) {}
    public record Answer(String prompt, String answer) {}
    public record Event(UUID id, String status, String message, Instant createdAt) {}
    public record Application(UUID id, UUID jobId, String jobTitle, String organizationName, String status,
                              UUID documentId, JsonNode profileSnapshot, JsonNode answers, Instant submittedAt,
                              List<Event> events) {}
    public record Page(List<Application> items, int page, int size, long total) {}
    public record DataRequest(UUID id, String status, Instant createdAt) {}
}
