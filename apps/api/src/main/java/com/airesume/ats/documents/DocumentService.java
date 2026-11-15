package com.airesume.ats.documents;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.PathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DocumentService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final AuditService audit;
    private final OrganizationService organizations;
    private final Path storageRoot;

    public DocumentService(JdbcTemplate jdbc, IdentityService identities, AuditService audit,
                           OrganizationService organizations,
                           @Value("${app.document-dir}") String documentDir) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.audit = audit;
        this.organizations = organizations;
        this.storageRoot = Path.of(documentDir).toAbsolutePath().normalize();
    }

    @Transactional
    public Document upload(MultipartFile file) {
        if (file.isEmpty() || file.getSize() > 10_000_000) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Choose a file under 10 MB");
        }
        String original = file.getOriginalFilename() == null ? "document" : file.getOriginalFilename();
        original = original.replace('\\', '/');
        original = original.substring(original.lastIndexOf('/') + 1);
        if (original.isBlank() || original.length() > 255) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid filename");
        }
        String extension = original.substring(original.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        String mediaType = switch (extension) {
            case "pdf" -> "application/pdf";
            case "docx" -> "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case "txt" -> "text/plain";
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only PDF, DOCX, or TXT files are supported");
        };
        UUID owner = identities.currentUserId();
        UUID id = UUID.randomUUID();
        String storageKey = owner + "/" + id + "." + extension;
        Path stored = storageRoot.resolve(storageKey);
        try {
            Files.createDirectories(stored.getParent());
            try (var stream = file.getInputStream()) {
                Files.copy(stream, stored);
            }
            try {
                Files.setPosixFilePermissions(stored, Set.of(PosixFilePermission.OWNER_READ,
                        PosixFilePermission.OWNER_WRITE));
            } catch (UnsupportedOperationException ignored) {
                // Windows filesystems use their own access controls.
            }
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not store document", exception);
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status != STATUS_COMMITTED) {
                    try { Files.deleteIfExists(stored); } catch (IOException ignored) {}
                }
            }
        });
        jdbc.update("INSERT INTO documents (id, owner_user_id, original_filename, media_type, byte_size, storage_key) " +
                "VALUES (?, ?, ?, ?, ?, ?)", id, owner, original, mediaType, file.getSize(), storageKey);
        audit.record(owner, null, "document.upload", "document", id);
        return getMetadata(id, owner);
    }

    public List<Document> mine() {
        return jdbc.query("SELECT id, original_filename, media_type, byte_size, created_at FROM documents " +
                        "WHERE owner_user_id = ? ORDER BY created_at DESC",
                (rs, row) -> map(rs), identities.currentUserId());
    }

    public Download download(UUID id) {
        UUID owner = identities.currentUserId();
        List<String> keys = jdbc.query("SELECT storage_key FROM documents WHERE id = ? AND owner_user_id = ?",
                (rs, row) -> rs.getString("storage_key"), id, owner);
        if (keys.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        Path path = storageRoot.resolve(keys.getFirst()).normalize();
        if (!path.startsWith(storageRoot) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document file not found");
        }
        audit.record(owner, null, "document.download", "document", id);
        return new Download(getMetadata(id, owner), new PathResource(path));
    }

    public Download downloadForReview(UUID organizationId, UUID jobId, UUID applicationId) {
        organizations.requireMember(organizationId);
        List<ReviewFile> matches = jdbc.query("SELECT d.id, d.original_filename, d.media_type, d.byte_size, " +
                        "d.created_at, d.storage_key FROM applications a JOIN jobs j ON j.id = a.job_id " +
                        "JOIN documents d ON d.id = a.document_id WHERE a.id = ? AND a.job_id = ? " +
                        "AND j.organization_id = ?", (rs, row) -> new ReviewFile(
                new Document(rs.getObject("id", UUID.class), rs.getString("original_filename"),
                        rs.getString("media_type"), rs.getLong("byte_size"),
                        rs.getTimestamp("created_at").toInstant()), rs.getString("storage_key")),
                applicationId, jobId, organizationId);
        if (matches.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Application document not found.");
        ReviewFile file = matches.getFirst();
        Path path = storageRoot.resolve(file.key()).normalize();
        if (!path.startsWith(storageRoot) || !Files.isRegularFile(path)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document file not found.");
        }
        audit.record(identities.currentUserId(), organizationId, "document.review_download", "document", file.document().id());
        return new Download(file.document(), new PathResource(path));
    }

    private Document getMetadata(UUID id, UUID owner) {
        List<Document> results = jdbc.query("SELECT id, original_filename, media_type, byte_size, created_at " +
                        "FROM documents WHERE id = ? AND owner_user_id = ?", (rs, row) -> map(rs), id, owner);
        if (results.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found");
        return results.getFirst();
    }

    private static Document map(java.sql.ResultSet rs) throws java.sql.SQLException {
        return new Document(rs.getObject("id", UUID.class), rs.getString("original_filename"),
                rs.getString("media_type"), rs.getLong("byte_size"), rs.getTimestamp("created_at").toInstant());
    }

    public record Document(UUID id, String filename, String mediaType, long byteSize, Instant createdAt) {}
    public record Download(Document metadata, Resource resource) {}
    private record ReviewFile(Document document, String key) {}
}
