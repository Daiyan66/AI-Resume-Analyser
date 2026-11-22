package com.airesume.ats.workflow;

import com.airesume.ats.candidate.CandidateService;
import com.airesume.ats.candidate.JobService;
import com.airesume.ats.documents.DocumentService;
import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ScreeningService {
    private final JdbcTemplate jdbc;
    private final JobService jobs;
    private final CandidateService candidates;
    private final DocumentService documents;
    private final IdentityService identities;
    private final OrganizationService organizations;
    private final AuditService audit;
    private final ObjectMapper json;

    public ScreeningService(JdbcTemplate jdbc, JobService jobs, CandidateService candidates, DocumentService documents,
                             IdentityService identities, OrganizationService organizations, AuditService audit, ObjectMapper json) {
        this.jdbc = jdbc;
        this.jobs = jobs;
        this.candidates = candidates;
        this.documents = documents;
        this.identities = identities;
        this.organizations = organizations;
        this.audit = audit;
        this.json = json;
    }

    public ImportedDraft importJob(UUID org, MultipartFile file) {
        organizations.requireMember(org);
        String name = DocumentText.filename(file.getOriginalFilename());
        try (var stream = file.getInputStream()) {
            String text = DocumentText.extract(name, stream);
            String title = name.substring(0, name.lastIndexOf('.')).replace('_', ' ').strip();
            return new ImportedDraft(title.isEmpty() ? "Imported draft" : title.substring(0, Math.min(title.length(), 160)), text);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "Choose a readable PDF, DOCX or UTF-8 TXT document under 2 MB.");
        }
    }

    @Transactional
    public Batch screen(UUID org, UUID jobId, List<MultipartFile> files) {
        JobService.Job job = jobs.privateJob(org, jobId);
        var criteria = batchCriteria(job);
        if (files.isEmpty() || files.size() > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose between one and five sample or authorized files.");
        }
        UUID id = UUID.randomUUID();
        UUID actor = identities.currentUserId();
        jdbc.update("INSERT INTO resume_screening_batches (id, job_id, created_by) VALUES (?, ?, ?)", id, jobId, actor);
        for (MultipartFile file : files) {
            String name = DocumentText.filename(file.getOriginalFilename());
            String state;
            List<Finding> findings;
            try (var stream = file.getInputStream()) {
                String text = DocumentText.extract(name, stream);
                findings = match(criteria, text);
                state = "READY";
            } catch (IOException ex) {
                findings = List.of();
                state = "UNREADABLE";
            }
            jdbc.update("INSERT INTO resume_screening_items (id, batch_id, filename, state, evidence) VALUES (?, ?, ?, ?, ?::jsonb)",
                    UUID.randomUUID(), id, name, state, json.valueToTree(findings).toString());
        }
        audit.record(actor, org, "screening.batch_created", "screening_batch", id);
        return batch(org, jobId, id);
    }

    public List<Summary> batches(UUID org, UUID job, int page, int size) {
        jobs.privateJob(org, job);
        return jdbc.query("SELECT b.id, b.created_at, count(i.id) FROM resume_screening_batches b " +
                        "LEFT JOIN resume_screening_items i ON i.batch_id = b.id WHERE b.job_id = ? GROUP BY b.id " +
                        "ORDER BY b.created_at DESC, b.id LIMIT ? OFFSET ?",
                (rs, row) -> new Summary(rs.getObject(1, UUID.class), rs.getTimestamp(2).toInstant(), rs.getLong(3)),
                job, size, (long) page * size);
    }

    public Batch batch(UUID org, UUID job, UUID batch) {
        jobs.privateJob(org, job);
        if (!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM resume_screening_batches WHERE id = ? " +
                "AND job_id = ?)", Boolean.class, batch, job))) throw notFound();
        var items = jdbc.query("SELECT id, filename, state, evidence FROM resume_screening_items WHERE batch_id = ? ORDER BY created_at, id",
                (rs, row) -> new Item(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), parse(rs.getString(4))), batch);
        return new Batch(batch, items);
    }

    @Transactional
    public void deleteBatch(UUID org, UUID job, UUID batch) {
        jobs.privateJob(org, job);
        // Lock the parent before removing children so concurrent removals serialize.
        var exists = jdbc.query("SELECT id FROM resume_screening_batches WHERE id = ? AND job_id = ? FOR UPDATE",
                (rs, row) -> rs.getObject(1, UUID.class), batch, job);
        if (exists.isEmpty()) throw notFound();
        jdbc.update("DELETE FROM resume_screening_items WHERE batch_id = ?", batch);
        jdbc.update("DELETE FROM resume_screening_batches WHERE id = ?", batch);
        audit.record(identities.currentUserId(), org, "screening.batch_deleted", "screening_batch", batch);
    }

    public List<Finding> applicationEvidence(UUID org, UUID job, UUID application) {
        JobService.Job listing = jobs.privateJob(org, job);
        return match(listing.criteria(), readText(documents.downloadForReview(org, job, application)));
    }

    public ExtractedText ownDocumentText(UUID document) {
        return new ExtractedText(readText(documents.download(document)), "DOCUMENT_TEXT");
    }

    public List<CoachingTip> coaching(UUID application) {
        CandidateService.Application owned = candidates.application(application);
        var criteria = jdbc.query("SELECT id, description, importance FROM job_criteria WHERE job_id = ? ORDER BY position",
                (rs, row) -> new JobService.Criterion(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), null),
                owned.jobId());
        String source = owned.profileSnapshot().path("profile").path("skills").asText("") + "\n" +
                owned.profileSnapshot().path("profile").path("experience").asText("") + "\n" +
                owned.profileSnapshot().path("profile").path("summary").asText("");
        return match(criteria, source).stream().map(finding -> new CoachingTip(finding.criterion(), finding.excerpt(),
                finding.excerpt() == null
                        ? "Prepare a specific example for this criterion and explain the outcome."
                        : "Expand on this example with the result and your own contribution.")).toList();
    }

    private static String readText(DocumentService.Download file) {
        try (var stream = file.resource().getInputStream()) {
            return DocumentText.extract(file.metadata().filename(), stream);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "The submitted document cannot be read.");
        }
    }

    private static List<JobService.Criterion> batchCriteria(JobService.Job job) {
        var criteria = new ArrayList<>(job.criteria().stream()
                .filter(criterion -> !"Overall role requirements".equals(criterion.description())).toList());
        var seen = new java.util.HashSet<String>();
        criteria.forEach(criterion -> seen.add(criterion.description().toLowerCase(java.util.Locale.ROOT).strip()));
        // Requirements supply additional literal checks, including for jobs with the default rubric.
        java.util.Arrays.stream(job.requirements().split("[\\r\\n;]+"))
                .map(line -> line.replaceFirst("^\\s*(?:[-*•]|[0-9]+[.)])?\\s*", "").strip().replaceFirst("\\.$", ""))
                .filter(line -> !line.isBlank() && seen.add(line.toLowerCase(java.util.Locale.ROOT)))
                .limit(12)
                .forEach(line -> criteria.add(new JobService.Criterion(null, line.substring(0, Math.min(line.length(), 500)),
                        "REQUIRED", null)));
        return criteria.isEmpty() ? job.criteria() : criteria;
    }

    private static List<Finding> match(List<JobService.Criterion> criteria, String text) {
        List<Finding> results = new ArrayList<>();
        String[] lines = text.split("[\\r\\n]+");
        for (var criterion : criteria) {
            String phrase = criterion.description().strip();
            Pattern exact = Pattern.compile(Pattern.quote(phrase), Pattern.CASE_INSENSITIVE | Pattern.UNICODE_CASE);
            String excerpt = null;
            for (int line = 0; line < lines.length; line++) {
                String clean = lines[line].strip();
                var match = exact.matcher(clean);
                if (phrase.isEmpty() || !match.find()) continue;
                int hit = match.start();
                int start = Math.max(hit - 20, 0);
                excerpt = clean.substring(start, Math.min(clean.length(), start + Math.max(240, phrase.length() + 20)));
                results.add(new Finding(criterion.id(), criterion.description(), excerpt, line + 1));
                break;
            }
            if (excerpt == null) results.add(new Finding(criterion.id(), criterion.description(), null, null));
        }
        return results;
    }

    private JsonNode parse(String data) {
        try { return json.readTree(data); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Invalid screening evidence data", ex); }
    }

    private static ResponseStatusException notFound() { return new ResponseStatusException(HttpStatus.NOT_FOUND, "Record not found."); }

    public record ImportedDraft(String title, String description) {}
    public record Finding(UUID criterionId, String criterion, String excerpt, Integer extractedLine) {}
    public record CoachingTip(String criterion, String profileExcerpt, String suggestion) {}
    public record ExtractedText(String text, String source) {}
    public record Item(UUID id, String filename, String state, JsonNode evidence) {}
    public record Batch(UUID id, List<Item> items) {}
    public record Summary(UUID id, java.time.Instant createdAt, long itemCount) {}
}
