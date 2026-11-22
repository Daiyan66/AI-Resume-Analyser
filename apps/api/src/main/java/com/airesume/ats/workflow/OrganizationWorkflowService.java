package com.airesume.ats.workflow;

import com.airesume.ats.candidate.JobService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganizationWorkflowService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final OrganizationService organizations;
    private final JobService jobs;
    private final AuditService audit;
    private static final String SHARED_WITH_ORG = "EXISTS (SELECT 1 FROM applications a JOIN jobs j ON j.id = a.job_id " +
            "WHERE a.candidate_user_id = d.user_id AND j.organization_id = ?)";
    private static final String DATA_REQUESTS = """
            SELECT d.id, u.display_name, d.created_at, r.outcome, r.reviewed_at
              FROM candidate_data_requests d JOIN users u ON u.id = d.user_id
              LEFT JOIN organization_data_request_reviews r ON r.request_id = d.id AND r.organization_id = ?
            """;
    private static final String ACCESS_REQUESTS = """
            SELECT r.*, o.name AS organization_name, u.email
              FROM recruiter_access_requests r JOIN organizations o ON o.id = r.organization_id
              JOIN users u ON u.id = r.applicant_id
            """;

    public OrganizationWorkflowService(JdbcTemplate jdbc, IdentityService identities, OrganizationService organizations,
                                       JobService jobs, AuditService audit) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.organizations = organizations;
        this.jobs = jobs;
        this.audit = audit;
    }

    public Report report(UUID org, UUID job) {
        organizations.requireMember(org);
        if (job != null) jobs.privateJob(org, job);
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String status : List.of("SUBMITTED", "IN_REVIEW", "INTERVIEW", "OFFER", "HIRED", "NOT_SELECTED", "WITHDRAWN")) {
            counts.put(status, 0L);
        }
        String filter = " FROM applications a JOIN jobs j ON j.id = a.job_id WHERE j.organization_id = ?" +
                (job == null ? "" : " AND j.id = ?");
        Object[] args = job == null ? new Object[] {org} : new Object[] {org, job};
        jdbc.query("SELECT a.status, count(*)" + filter + " GROUP BY a.status",
                rs -> { counts.put(rs.getString(1), rs.getLong(2)); }, args);
        Long withReview = jdbc.queryForObject("SELECT count(*)" + filter +
                " AND EXISTS (SELECT 1 FROM application_reviews r WHERE r.application_id = a.id)", Long.class, args);
        String weekStart = "date_trunc('week', now() AT TIME ZONE 'UTC')";
        var weeks = jdbc.query("SELECT week.start::date, COALESCE(totals.total, 0) " +
                        "FROM generate_series(" + weekStart + " - INTERVAL '7 weeks', " + weekStart +
                        ", INTERVAL '1 week') AS week(start) LEFT JOIN (" +
                        "SELECT date_trunc('week', a.submitted_at AT TIME ZONE 'UTC') AS start, count(*) AS total" + filter +
                        " AND a.submitted_at >= (" + weekStart + " - INTERVAL '7 weeks') AT TIME ZONE 'UTC' GROUP BY 1" +
                        ") totals USING (start) ORDER BY week.start",
                (rs, row) -> new Week(rs.getDate(1).toLocalDate().toString(), rs.getLong(2)), args);
        return new Report(counts, counts.values().stream().mapToLong(Long::longValue).sum(), withReview == null ? 0 : withReview, weeks);
    }

    public ApplicationPage pipeline(UUID org, UUID job, String status, String query, int page, int size) {
        organizations.requireMember(org);
        if (job != null) jobs.privateJob(org, job);
        String from = " FROM applications a JOIN jobs j ON j.id = a.job_id";
        String filter = " WHERE j.organization_id = ? AND (? = '' OR a.status = ?) AND (? = '' OR strpos(lower(concat_ws(' ', j.title, " +
                "a.profile_snapshot->>'displayName', a.profile_snapshot->>'email')), lower(?)) > 0)" +
                (job == null ? "" : " AND j.id = ?");
        String state = status == null ? "" : status;
        String search = query.strip();
        Object[] params = job == null ? new Object[] {org, state, state, search, search}
                : new Object[] {org, state, state, search, search, job};
        Long total = jdbc.queryForObject("SELECT count(*)" + from + filter, Long.class, params);
        var paged = new java.util.ArrayList<>(java.util.Arrays.asList(params));
        paged.add(size);
        paged.add((long) page * size);
        String order = "HIRED".equals(state) ? "d.created_at DESC NULLS LAST, a.submitted_at DESC" : "a.submitted_at DESC";
        String withDecision = from + " LEFT JOIN application_decisions d ON d.application_id = a.id AND d.outcome = 'HIRED'" + filter;
        var items = jdbc.query("SELECT a.id, a.job_id, j.title, a.profile_snapshot->>'displayName', a.status, a.submitted_at, d.created_at" +
                        withDecision + " ORDER BY " + order + ", a.id LIMIT ? OFFSET ?",
                (rs, row) -> {
                    var hiredAt = rs.getTimestamp(7);
                    return new ApplicationSummary(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3),
                            rs.getString(4), rs.getString(5), rs.getTimestamp(6).toInstant(), hiredAt == null ? null : hiredAt.toInstant());
                }, paged.toArray());
        return new ApplicationPage(items, page, size, total == null ? 0 : total);
    }

    public List<JobOption> applicationJobs(UUID org) {
        organizations.requireMember(org);
        return jdbc.query("SELECT id, title, status FROM jobs WHERE organization_id = ? AND status <> 'DRAFT' ORDER BY lower(title), id",
                (rs, row) -> new JobOption(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)), org);
    }

    public List<DataReview> dataRequests(UUID org, int page, int size) {
        organizations.requireAdmin(org);
        return jdbc.query(DATA_REQUESTS + " WHERE " + SHARED_WITH_ORG + " ORDER BY d.created_at DESC, d.id LIMIT ? OFFSET ?",
                OrganizationWorkflowService::mapData, org, org, size, (long) page * size);
    }

    @Transactional
    public DataReview reviewData(UUID org, UUID request, String outcome, String reason) {
        organizations.requireAdmin(org);
        dataRequest(org, request);
        jdbc.update("INSERT INTO organization_data_request_reviews (request_id, organization_id, reviewer_id, outcome, reason) " +
                "VALUES (?, ?, ?, ?, ?) ON CONFLICT (request_id, organization_id) DO UPDATE SET " +
                "reviewer_id = EXCLUDED.reviewer_id, outcome = EXCLUDED.outcome, reason = EXCLUDED.reason, " +
                "reviewed_at = CURRENT_TIMESTAMP", request, org, identities.currentUserId(), outcome, reason.trim());
        audit.record(identities.currentUserId(), org, "data_request.organization_review", "data_request", request);
        return dataRequest(org, request);
    }

    private DataReview dataRequest(UUID org, UUID request) {
        var rows = jdbc.query(DATA_REQUESTS + " WHERE d.id = ? AND " + SHARED_WITH_ORG,
                OrganizationWorkflowService::mapData, org, request, org);
        if (rows.isEmpty()) throw notFound("Data request not found.");
        return rows.getFirst();
    }

    @Transactional
    public AccessRequest requestAccess(OrganizationWorkflowController.RequestAccess request) {
        UUID actor = identities.currentUserId();
        var matches = jdbc.query("SELECT id FROM organizations WHERE slug = ?", (rs, row) -> rs.getObject(1, UUID.class),
                request.organizationSlug().strip().toLowerCase(Locale.ROOT));
        if (matches.isEmpty()) throw notFound("Organization not found.");
        UUID org = matches.getFirst();
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM memberships WHERE " +
                "organization_id = ? AND user_id = ? AND status = 'ACTIVE')", Boolean.class, org, actor))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already belong to this organization.");
        }
        var document = jdbc.query("SELECT id FROM documents WHERE id = ? AND owner_user_id = ? FOR SHARE",
                (rs, row) -> rs.getObject(1, UUID.class), request.documentId(), actor);
        if (document.isEmpty()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose one of your own documents.");
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO recruiter_access_requests (id, organization_id, applicant_id, document_id, designation," +
                            " website, phone, disciplines) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", id, org, actor, request.documentId(),
                    request.designation().trim(), clean(request.website()), clean(request.phone()), clean(request.disciplines()));
        } catch (DuplicateKeyException ex) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You already have a pending request.");
        }
        audit.record(actor, org, "recruiter.access_requested", "recruiter_access_request", id);
        return accessRequest(org, id);
    }

    public List<AccessRequest> myAccessRequests() {
        return jdbc.query(ACCESS_REQUESTS + " WHERE r.applicant_id = ? ORDER BY r.created_at DESC LIMIT 50",
                OrganizationWorkflowService::mapAccess, identities.currentUserId());
    }

    public List<AccessRequest> accessRequests(UUID org, int page, int size) {
        organizations.requireAdmin(org);
        return jdbc.query(ACCESS_REQUESTS + " WHERE r.organization_id = ? ORDER BY r.created_at DESC, r.id LIMIT ? OFFSET ?",
                OrganizationWorkflowService::mapAccess, org, size, (long) page * size);
    }

    @Transactional
    public AccessRequest reviewAccess(UUID org, UUID request, String outcome) {
        organizations.requireAdmin(org);
        AccessRequest item = accessRequest(org, request);
        if ("APPROVED".equals(outcome) && item.documentId() == null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "The verification document is unavailable.");
        }
        int updated = jdbc.update("UPDATE recruiter_access_requests SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP " +
                "WHERE id = ? AND organization_id = ? AND status = 'PENDING'", outcome, identities.currentUserId(), request, org);
        if (updated != 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "This request has already been reviewed.");
        if ("APPROVED".equals(outcome)) {
            jdbc.update("INSERT INTO memberships (organization_id, user_id, role) VALUES (?, ?, 'RECRUITER') " +
                    "ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'ACTIVE' " +
                    "WHERE memberships.role = 'RECRUITER' AND memberships.status = 'REVOKED'", org, item.applicantId());
        }
        audit.record(identities.currentUserId(), org, "recruiter.access_" + outcome.toLowerCase(Locale.ROOT),
                "recruiter_access_request", request);
        return accessRequest(org, request);
    }

    private AccessRequest accessRequest(UUID org, UUID request) {
        var rows = jdbc.query(ACCESS_REQUESTS + " WHERE r.id = ? AND r.organization_id = ?",
                OrganizationWorkflowService::mapAccess, request, org);
        if (rows.isEmpty()) throw notFound("Recruiter access request not found.");
        return rows.getFirst();
    }

    private static ResponseStatusException notFound(String text) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, text);
    }

    private static String clean(String value) { return value == null ? "" : value.trim(); }

    private static DataReview mapData(ResultSet rs, int row) throws SQLException {
        var reviewed = rs.getTimestamp("reviewed_at");
        return new DataReview(rs.getObject("id", UUID.class), rs.getString("display_name"),
                rs.getTimestamp("created_at").toInstant(), rs.getString("outcome"), reviewed == null ? null : reviewed.toInstant());
    }

    private static AccessRequest mapAccess(ResultSet rs, int row) throws SQLException {
        return new AccessRequest(rs.getObject("id", UUID.class), rs.getObject("organization_id", UUID.class),
                rs.getString("organization_name"), rs.getObject("applicant_id", UUID.class), rs.getString("email"),
                rs.getObject("document_id", UUID.class), rs.getString("designation"), rs.getString("website"),
                rs.getString("phone"), rs.getString("disciplines"), rs.getString("status"), rs.getTimestamp("created_at").toInstant());
    }

    public record JobOption(UUID id, String title, String status) {}
    public record ApplicationSummary(UUID id, UUID jobId, String jobTitle, String candidateName, String status, Instant submittedAt, Instant hiredAt) {}
    public record ApplicationPage(List<ApplicationSummary> items, int page, int size, long total) {}
    public record Week(String start, long applications) {}
    public record Report(Map<String, Long> byStage, long applications, long applicationsWithReview, List<Week> weeklyApplications) {}
    public record DataReview(UUID requestId, String candidateName, Instant requestedAt, String outcome, Instant reviewedAt) {}
    public record AccessRequest(UUID id, UUID organizationId, String organizationName, UUID applicantId, String email,
                                UUID documentId, String designation, String website, String phone, String disciplines,
                                String status, Instant createdAt) {}
}
