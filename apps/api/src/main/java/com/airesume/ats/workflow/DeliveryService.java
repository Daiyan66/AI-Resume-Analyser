package com.airesume.ats.workflow;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import com.airesume.ats.security.AuditService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

@Service
public class DeliveryService {
    private final JdbcTemplate jdbc;
    private final JavaMailSender mail;
    private final TransactionTemplate transaction;
    private final OrganizationService organizations;
    private final IdentityService identities;
    private final AuditService audit;
    private final boolean enabled;
    private final String from;
    private final String publicUrl;

    public DeliveryService(JdbcTemplate jdbc, JavaMailSender mail, TransactionTemplate transaction,
                           OrganizationService organizations, IdentityService identities, AuditService audit,
                           @Value("${app.notifications.email-enabled:false}") boolean enabled,
                           @Value("${app.mail-from}") String from, @Value("${app.public-url}") String publicUrl) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.transaction = transaction;
        this.organizations = organizations;
        this.identities = identities;
        this.audit = audit;
        this.enabled = enabled;
        this.from = from;
        this.publicUrl = publicUrl;
    }

    @Transactional
    public void notifyCandidate(UUID org, UUID application, String message) {
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO candidate_notifications (id, recipient_user_id, application_id, message) " +
                "SELECT ?, candidate_user_id, id, ? FROM applications WHERE id = ?", id, message, application);
        if (enabled) jdbc.update("INSERT INTO notification_deliveries (notification_id, organization_id) VALUES (?, ?)", id, org);
    }

    public List<Delivery> list(UUID org, int page, int size) {
        organizations.requireAdmin(org);
        return jdbc.query("SELECT d.notification_id, n.application_id, d.status, d.attempts, d.updated_at " +
                        "FROM notification_deliveries d JOIN candidate_notifications n ON n.id = d.notification_id " +
                        "WHERE d.organization_id = ? ORDER BY d.updated_at DESC, d.notification_id LIMIT ? OFFSET ?",
                (rs, row) -> new Delivery(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3),
                        rs.getInt(4), rs.getTimestamp(5).toInstant()), org, size, (long) page * size);
    }

    @Transactional
    public void retry(UUID org, UUID notification) {
        organizations.requireAdmin(org);
        if (!enabled) throw new ResponseStatusException(HttpStatus.CONFLICT, "Email delivery is disabled.");
        int changed = jdbc.update("UPDATE notification_deliveries SET status = 'PENDING', attempts = 0, " +
                "next_attempt_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP " +
                "WHERE notification_id = ? AND organization_id = ? AND status = 'FAILED'", notification, org);
        if (changed != 1) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Failed delivery not found.");
        audit.record(identities.currentUserId(), org, "notification.delivery_retry", "notification", notification);
    }

    @Scheduled(fixedDelayString = "${app.notifications.poll-ms:10000}")
    public void dispatch() {
        if (!enabled) return;
        for (int processed = 0; processed < 10; processed++) {
            if (!Boolean.TRUE.equals(transaction.execute(status -> dispatchOne()))) return;
        }
    }

    private boolean dispatchOne() {
        var pending = jdbc.query("SELECT d.notification_id, u.email, d.attempts " +
                "FROM notification_deliveries d JOIN candidate_notifications n ON n.id = d.notification_id " +
                "JOIN users u ON u.id = n.recipient_user_id WHERE d.status = 'PENDING' " +
                "AND d.next_attempt_at <= CURRENT_TIMESTAMP ORDER BY d.next_attempt_at, d.notification_id " +
                "LIMIT 1 FOR UPDATE OF d SKIP LOCKED",
                (rs, row) -> new Pending(rs.getObject(1, UUID.class), rs.getString(2), rs.getInt(3)));
        if (pending.isEmpty()) return false;
        Pending item = pending.getFirst();
        var message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(item.email());
        message.setSubject("An update on your application");
        message.setText("Sign in to see your latest application update:\n" + publicUrl + "/connected#candidate");
        int attempts = item.attempts() + 1;
        String result;
        try {
            mail.send(message);
            result = "SENT";
        } catch (MailException ex) {
            result = attempts >= 3 ? "FAILED" : "PENDING";
            LoggerFactory.getLogger(DeliveryService.class).warn("Application email delivery attempt failed");
        }
        jdbc.update("UPDATE notification_deliveries SET status = ?, attempts = ?, updated_at = CURRENT_TIMESTAMP, " +
                "next_attempt_at = CURRENT_TIMESTAMP + (? * INTERVAL '1 minute') WHERE notification_id = ?",
                result, attempts, attempts * 2, item.id());
        return true;
    }

    public record Delivery(UUID id, UUID applicationId, String status, int attempts, Instant updatedAt) {}
    private record Pending(UUID id, String email, int attempts) {}
}
