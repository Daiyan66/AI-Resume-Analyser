package com.airesume.ats.identity;

import com.airesume.ats.security.AuditService;
import com.airesume.ats.security.TokenCodec;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class IdentityService implements UserDetailsService {
    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final AuditService audit;
    private final JavaMailSender mail;
    private final String publicUrl;
    private final String mailFrom;

    public IdentityService(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, AuditService audit,
                           JavaMailSender mail, @Value("${app.public-url}") String publicUrl,
                           @Value("${app.mail-from}") String mailFrom) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.mail = mail;
        this.publicUrl = publicUrl;
        this.mailFrom = mailFrom;
    }

    public static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    @Override
    public AppPrincipal loadUserByUsername(String email) throws UsernameNotFoundException {
        List<AppPrincipal> users = jdbc.query(
                "SELECT id, email, password_hash, email_verified_at, credential_version FROM users WHERE lower(email) = ?",
                (rs, row) -> new AppPrincipal(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("password_hash"), rs.getTimestamp("email_verified_at") != null, rs.getLong("credential_version")), normalizeEmail(email));
        if (users.isEmpty()) throw new UsernameNotFoundException("Invalid email or password");
        return users.getFirst();
    }

    String encodePassword(String password) {
        if (password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must fit within 72 UTF-8 bytes.");
        }
        return passwordEncoder.encode(password);
    }

    @Transactional
    public Account register(String email, String displayName, String password) {
        UUID id = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)",
                    id, normalizeEmail(email), displayName.trim(), encodePassword(password));
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        sendVerificationEmail(id, normalizeEmail(email));
        audit.record(id, null, "account.register", "user", id);
        return account(id);
    }

    @Transactional
    public void resendVerification(String email) {
        String normalized = normalizeEmail(email);
        List<UUID> ids = jdbc.query("SELECT id FROM users WHERE lower(email) = ? AND email_verified_at IS NULL FOR UPDATE",
                (rs, row) -> rs.getObject("id", UUID.class), normalized);
        if (ids.isEmpty()) return;
        UUID id = ids.getFirst();
        jdbc.update("UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP " +
                "WHERE user_id = ? AND used_at IS NULL", id);
        sendVerificationEmail(id, normalized);
        audit.record(id, null, "account.resend_verification", "user", id);
    }

    private void sendVerificationEmail(UUID id, String email) {
        String token = TokenCodec.newToken();
        jdbc.update("INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)",
                UUID.randomUUID(), id, TokenCodec.hash(token), Timestamp.from(Instant.now().plus(24, ChronoUnit.HOURS)));
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(email);
        message.setSubject("Verify your AI Resume Analyser email");
        message.setText("Open this link to verify your account:\n" + publicUrl + "/?verify=" + token +
                "\n\nThis link expires in 24 hours.");
        mail.send(message);
    }

    @Transactional
    public void verifyEmail(String token) {
        List<UUID> ids = jdbc.query("SELECT user_id FROM email_verification_tokens WHERE token_hash = ? " +
                        "AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP",
                (rs, row) -> rs.getObject("user_id", UUID.class), TokenCodec.hash(token));
        if (ids.isEmpty()) throw new ResponseStatusException(HttpStatus.GONE, "Verification link expired or used");
        UUID id = ids.getFirst();
        int updated = jdbc.update("UPDATE email_verification_tokens SET used_at = CURRENT_TIMESTAMP " +
                "WHERE token_hash = ? AND used_at IS NULL", TokenCodec.hash(token));
        if (updated != 1) throw new ResponseStatusException(HttpStatus.GONE, "Verification link already used");
        jdbc.update("UPDATE users SET email_verified_at = CURRENT_TIMESTAMP WHERE id = ?", id);
        audit.record(id, null, "account.verify_email", "user", id);
    }

    public UUID currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof AppPrincipal principal)) {
            throw new AccessDeniedException("Sign in required");
        }
        return principal.id();
    }

    public Account currentAccount() {
        return account(currentUserId());
    }

    public Account account(UUID id) {
        List<Account> result = jdbc.query("SELECT id, email, display_name, email_verified_at FROM users WHERE id = ?",
                (rs, row) -> new Account(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), rs.getTimestamp("email_verified_at") != null), id);
        if (result.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found");
        return result.getFirst();
    }

    public record Account(UUID id, String email, String displayName, boolean emailVerified) {}
}
