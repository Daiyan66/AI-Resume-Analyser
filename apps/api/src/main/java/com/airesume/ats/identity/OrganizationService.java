package com.airesume.ats.identity;

import com.airesume.ats.security.AuditService;
import com.airesume.ats.security.TokenCodec;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OrganizationService {
    private final JdbcTemplate jdbc;
    private final IdentityService identities;
    private final AuditService audit;
    private final JavaMailSender mail;
    private final String publicUrl;
    private final String mailFrom;

    public OrganizationService(JdbcTemplate jdbc, IdentityService identities, AuditService audit, JavaMailSender mail,
                               @Value("${app.public-url}") String publicUrl, @Value("${app.mail-from}") String mailFrom) {
        this.jdbc = jdbc;
        this.identities = identities;
        this.audit = audit;
        this.mail = mail;
        this.publicUrl = publicUrl;
        this.mailFrom = mailFrom;
    }

    public List<OrganizationMembership> myOrganizations() {
        return jdbc.query("SELECT o.id, o.slug, o.name, m.role FROM organizations o " +
                        "JOIN memberships m ON m.organization_id = o.id " +
                        "WHERE m.user_id = ? AND m.status = 'ACTIVE' ORDER BY o.name",
                (rs, row) -> new OrganizationMembership(rs.getObject("id", UUID.class), rs.getString("slug"),
                        rs.getString("name"), rs.getString("role")), identities.currentUserId());
    }

    @Transactional
    public OrganizationMembership create(String slug, String name) {
        UUID owner = identities.currentUserId();
        UUID orgId = UUID.randomUUID();
        try {
            jdbc.update("INSERT INTO organizations (id, slug, name) VALUES (?, ?, ?)", orgId, slug, name.trim());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Organization slug is already in use");
        }
        jdbc.update("INSERT INTO memberships (organization_id, user_id, role) VALUES (?, ?, 'ADMIN')", orgId, owner);
        jdbc.update("INSERT INTO organization_policies (organization_id) VALUES (?)", orgId);
        audit.record(owner, orgId, "organization.create", "organization", orgId);
        return new OrganizationMembership(orgId, slug, name.trim(), "ADMIN");
    }

    public void requireMember(UUID organizationId) {
        requireRole(organizationId, false);
    }

    public void requireAdmin(UUID organizationId) {
        requireRole(organizationId, true);
    }

    private void requireRole(UUID organizationId, boolean adminOnly) {
        Integer count = jdbc.queryForObject("SELECT count(*) FROM memberships WHERE organization_id = ? " +
                        "AND user_id = ? AND status = 'ACTIVE'" + (adminOnly ? " AND role = 'ADMIN'" : ""),
                Integer.class, organizationId, identities.currentUserId());
        if (count == null || count == 0) throw new AccessDeniedException("Organization access denied");
    }

    @Transactional
    public Invitation invite(UUID organizationId, String email, String role) {
        requireAdmin(organizationId);
        UUID actor = identities.currentUserId();
        String normalizedEmail = IdentityService.normalizeEmail(email);
        String organizationName = jdbc.queryForObject("SELECT name FROM organizations WHERE id = ?", String.class, organizationId);
        String rawToken = TokenCodec.newToken();
        UUID invitationId = UUID.randomUUID();
        Instant expiresAt = Instant.now().plus(7, ChronoUnit.DAYS);
        jdbc.update("INSERT INTO invitations (id, organization_id, email, role, token_hash, created_by, expires_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, ?)", invitationId, organizationId, normalizedEmail, role,
                TokenCodec.hash(rawToken), actor, java.sql.Timestamp.from(expiresAt));

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailFrom);
        message.setTo(normalizedEmail);
        message.setSubject("Invitation to " + organizationName);
        message.setText("You have been invited to join " + organizationName + " as " + role + ".\n\n" +
                "Sign in or register with this email, then open: " + publicUrl + "/invite?token=" + rawToken +
                "\n\nThis invitation expires in 7 days.");
        mail.send(message);
        audit.record(actor, organizationId, "membership.invite", "invitation", invitationId);
        return new Invitation(invitationId, normalizedEmail, role, expiresAt);
    }

    @Transactional
    public OrganizationMembership accept(String token) {
        UUID actor = identities.currentUserId();
        IdentityService.Account account = identities.currentAccount();
        List<PendingInvitation> matches = jdbc.query("SELECT i.id, i.organization_id, i.email, i.role, i.expires_at, " +
                        "i.accepted_at, o.slug, o.name FROM invitations i JOIN organizations o ON o.id = i.organization_id " +
                        "WHERE i.token_hash = ?",
                (rs, row) -> new PendingInvitation(rs.getObject("id", UUID.class),
                        rs.getObject("organization_id", UUID.class), rs.getString("email"), rs.getString("role"),
                        rs.getTimestamp("expires_at").toInstant(), rs.getTimestamp("accepted_at") != null,
                        rs.getString("slug"), rs.getString("name")), TokenCodec.hash(token));
        if (matches.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invitation not found");
        PendingInvitation invitation = matches.getFirst();
        if (invitation.accepted() || !invitation.expiresAt().isAfter(Instant.now())) {
            throw new ResponseStatusException(HttpStatus.GONE, "Invitation expired or already used");
        }
        if (!invitation.email().equals(account.email())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "This invitation belongs to another email. Sign in with the invited account to accept it.");
        }
        int updated = jdbc.update("UPDATE invitations SET accepted_at = CURRENT_TIMESTAMP WHERE id = ? AND accepted_at IS NULL",
                invitation.id());
        if (updated != 1) throw new ResponseStatusException(HttpStatus.GONE, "Invitation already used");
        jdbc.update("INSERT INTO memberships (organization_id, user_id, role, status) VALUES (?, ?, ?, 'ACTIVE') " +
                        "ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = 'ACTIVE'",
                invitation.organizationId(), actor, invitation.role());
        audit.record(actor, invitation.organizationId(), "membership.accept", "invitation", invitation.id());
        return new OrganizationMembership(invitation.organizationId(), invitation.slug(), invitation.name(), invitation.role());
    }

    public List<Member> members(UUID organizationId) {
        requireAdmin(organizationId);
        return jdbc.query("SELECT u.id, u.email, u.display_name, m.role, m.status FROM memberships m " +
                        "JOIN users u ON u.id = m.user_id WHERE m.organization_id = ? ORDER BY u.display_name",
                (rs, row) -> new Member(rs.getObject("id", UUID.class), rs.getString("email"),
                        rs.getString("display_name"), rs.getString("role"), rs.getString("status")), organizationId);
    }

    @Transactional
    public void revoke(UUID organizationId, UUID userId) {
        requireAdmin(organizationId);
        UUID actor = identities.currentUserId();
        if (actor.equals(userId)) throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot revoke yourself");
        List<String> roles = jdbc.query("SELECT role FROM memberships WHERE organization_id = ? AND user_id = ? " +
                "AND status = 'ACTIVE'", (rs, row) -> rs.getString("role"), organizationId, userId);
        if (roles.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Active member not found");
        if ("ADMIN".equals(roles.getFirst())) {
            Integer admins = jdbc.queryForObject("SELECT count(*) FROM memberships WHERE organization_id = ? " +
                    "AND role = 'ADMIN' AND status = 'ACTIVE'", Integer.class, organizationId);
            if (admins == null || admins <= 1) throw new ResponseStatusException(HttpStatus.CONFLICT, "Keep an active admin");
        }
        jdbc.update("UPDATE memberships SET status = 'REVOKED' WHERE organization_id = ? AND user_id = ?",
                organizationId, userId);
        audit.record(actor, organizationId, "membership.revoke", "user", userId);
    }

    public List<AuditEvent> recentAudit(UUID organizationId) {
        requireAdmin(organizationId);
        return jdbc.query("SELECT id, actor_user_id, action, target_type, target_id, created_at FROM audit_events " +
                        "WHERE organization_id = ? ORDER BY created_at DESC LIMIT 100",
                (rs, row) -> new AuditEvent(rs.getObject("id", UUID.class), rs.getObject("actor_user_id", UUID.class),
                        rs.getString("action"), rs.getString("target_type"), rs.getObject("target_id", UUID.class),
                        rs.getTimestamp("created_at").toInstant()), organizationId);
    }

    public Policy policy(UUID organizationId) {
        requireAdmin(organizationId);
        return jdbc.queryForObject("SELECT reapply_cooldown_days, retention_days, ai_enabled FROM organization_policies " +
                        "WHERE organization_id = ?", (rs, row) -> new Policy(rs.getInt(1), rs.getInt(2), rs.getBoolean(3)),
                organizationId);
    }

    @Transactional
    public Policy updatePolicy(UUID organizationId, int reapplyCooldownDays, int retentionDays, boolean aiEnabled) {
        requireAdmin(organizationId);
        jdbc.update("UPDATE organization_policies SET reapply_cooldown_days = ?, retention_days = ?, ai_enabled = ?, " +
                        "updated_at = CURRENT_TIMESTAMP WHERE organization_id = ?", reapplyCooldownDays, retentionDays,
                aiEnabled, organizationId);
        audit.record(identities.currentUserId(), organizationId, "organization.policy_update", "organization", organizationId);
        return policy(organizationId);
    }

    public record Policy(int reapplyCooldownDays, int retentionDays, boolean aiEnabled) {}

    public record OrganizationMembership(UUID organizationId, String slug, String name, String role) {}
    public record Invitation(UUID id, String email, String role, Instant expiresAt) {}
    public record Member(UUID id, String email, String displayName, String role, String status) {}
    public record AuditEvent(UUID id, UUID actorUserId, String action, String targetType, UUID targetId, Instant createdAt) {}
    private record PendingInvitation(UUID id, UUID organizationId, String email, String role, Instant expiresAt,
                                     boolean accepted, String slug, String name) {}
}
