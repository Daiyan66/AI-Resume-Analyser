package com.airesume.ats.identity;

import com.airesume.ats.security.AuditService;
import com.airesume.ats.security.TokenCodec;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PasswordResetService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final AuditService audit;
    private final JavaMailSender mail;
    private final String publicUrl;
    private final String from;

    public PasswordResetService(JdbcTemplate jdbc, IdentityService identities, AuditService audit, JavaMailSender mail,
                                @Value("${app.public-url}") String publicUrl, @Value("${app.mail-from}") String from) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.audit = audit;
        this.mail = mail;
        this.publicUrl = publicUrl;
        this.from = from;
    }

    @Transactional
    public void request(String email) {
        String normalized = IdentityService.normalizeEmail(email);
        var matches = jdbc.query("SELECT id FROM users WHERE lower(email) = ? AND email_verified_at IS NOT NULL FOR UPDATE",
                (rs, row) -> rs.getObject("id", UUID.class), normalized);
        if (matches.isEmpty()) return;
        UUID user = matches.getFirst();
        if (Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS (SELECT 1 FROM password_reset_tokens WHERE user_id = ? " +
                "AND created_at > CURRENT_TIMESTAMP - INTERVAL '1 minute')", Boolean.class, user))) return;
        jdbc.update("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND used_at IS NULL", user);
        String token = TokenCodec.newToken();
        jdbc.update("INSERT INTO password_reset_tokens (token_hash, user_id, expires_at) " +
                "VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '30 minutes')", TokenCodec.hash(token), user);
        audit.record(user, null, "account.password_reset_requested", "user", user);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(from);
                message.setTo(normalized);
                message.setSubject("Reset your AI Resume Analyser password");
                message.setText("Open this link to reset your password. It expires in 30 minutes.\n" +
                        publicUrl + "/auth/reset-password?token=" + token);
                try { mail.send(message); }
                catch (MailException ex) { LoggerFactory.getLogger(PasswordResetService.class).warn("Password reset email delivery failed"); }
            }
        });
    }

    @Transactional
    public void reset(String token, String password) {
        String hash = TokenCodec.hash(token);
        var matches = jdbc.query("SELECT user_id FROM password_reset_tokens WHERE token_hash = ? " +
                        "AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
                (rs, row) -> rs.getObject("user_id", UUID.class), hash);
        if (matches.isEmpty()) throw invalidLink();
        UUID user = matches.getFirst();
        jdbc.queryForObject("SELECT id FROM users WHERE id = ? FOR UPDATE", UUID.class, user);
        int updated = jdbc.update("UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token_hash = ? " +
                "AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP", hash);
        if (updated != 1) throw invalidLink();
        jdbc.update("UPDATE users SET password_hash = ?, credential_version = credential_version + 1 WHERE id = ?",
                identities.encodePassword(password), user);
        audit.record(user, null, "account.password_reset", "user", user);
    }

    private static ResponseStatusException invalidLink() {
        return new ResponseStatusException(HttpStatus.GONE, "Password reset link expired or already used.");
    }
}
