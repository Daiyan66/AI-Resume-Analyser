package com.airesume.ats.workflow;

import com.airesume.ats.identity.IdentityService;
import com.airesume.ats.identity.OrganizationService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/organizations/{org}/chat")
public class TeamChatController {
    private static final int PAGE_SIZE = 30;
    private static final String MESSAGE_FIELDS = """
            SELECT t.id, t.sender_id, u.display_name, t.body, t.sent_at
            FROM team_messages t JOIN users u ON u.id = t.sender_id
            """;
    private final JdbcTemplate jdbc;
    private final OrganizationService organizations;
    private final IdentityService identities;

    public TeamChatController(JdbcTemplate jdbc, OrganizationService organizations, IdentityService identities) {
        this.jdbc = jdbc;
        this.organizations = organizations;
        this.identities = identities;
    }

    @GetMapping("/people")
    public List<Person> people(@PathVariable UUID org) {
        organizations.requireMember(org);
        return jdbc.query("""
                SELECT u.id, u.display_name, m.role FROM memberships m JOIN users u ON u.id = m.user_id
                WHERE m.organization_id = ? AND m.status = 'ACTIVE' AND m.user_id <> ?
                ORDER BY lower(u.display_name), u.id
                """, (rs, row) -> new Person(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3)),
                org, identities.currentUserId());
    }

    @GetMapping("/messages")
    public MessagePage messages(@PathVariable UUID org, @RequestParam(required = false) UUID person,
                                @RequestParam(required = false) @Positive Long before,
                                @RequestParam(required = false) @Positive Long after) {
        organizations.requireMember(org);
        UUID sender = identities.currentUserId();
        if (before != null && after != null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Use one message cursor at a time.");
        }
        long cursor = after != null ? after : before == null ? Long.MAX_VALUE : before;
        String condition = after == null ? " AND t.id < ?" : " AND t.id > ?";
        String order = after == null ? " ORDER BY t.id DESC LIMIT ?" : " ORDER BY t.id ASC LIMIT ?";
        List<Message> messages;
        if (person == null) {
            messages = jdbc.query(MESSAGE_FIELDS + "WHERE t.organization_id = ?" + condition +
                    " AND t.recipient_id IS NULL" + order, TeamChatController::map, org, cursor, PAGE_SIZE + 1);
        } else {
            validatePerson(org, sender, person);
            messages = jdbc.query(MESSAGE_FIELDS + "WHERE t.organization_id = ?" + condition +
                    " AND ((t.sender_id = ? AND t.recipient_id = ?) OR (t.sender_id = ? AND t.recipient_id = ?))" + order,
                    TeamChatController::map, org, cursor, sender, person, person, sender, PAGE_SIZE + 1);
        }
        return new MessagePage(messages.stream().limit(PAGE_SIZE).toList(), after == null && messages.size() > PAGE_SIZE);
    }

    @PostMapping("/messages")
    @Transactional
    @ResponseStatus(HttpStatus.CREATED)
    public Message send(@PathVariable UUID org, @Valid @RequestBody SendMessage request) {
        organizations.requireMember(org);
        // Keep committed message order consistent with the cursor within each organization.
        jdbc.queryForObject("SELECT id FROM organizations WHERE id = ? FOR NO KEY UPDATE", UUID.class, org);
        UUID sender = identities.currentUserId();
        UUID person = request.person();
        if (person != null) validatePerson(org, sender, person);
        long id = jdbc.queryForObject("""
                INSERT INTO team_messages (organization_id, sender_id, recipient_id, body)
                VALUES (?, ?, ?, ?) RETURNING id
                """, Long.class, org, sender, person, request.body().strip());
        return jdbc.queryForObject(MESSAGE_FIELDS + "WHERE t.id = ?", TeamChatController::map, id);
    }

    private void validatePerson(UUID org, UUID sender, UUID person) {
        if (person.equals(sender) || !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM memberships WHERE organization_id = ? AND user_id = ? AND status = 'ACTIVE')",
                Boolean.class, org, person))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "This teammate is unavailable in your organization.");
        }
    }

    private static Message map(ResultSet rs, int row) throws SQLException {
        return new Message(rs.getString(1), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4),
                rs.getTimestamp(5).toInstant());
    }

    public record Person(UUID id, String displayName, String role) {}
    public record SendMessage(UUID person, @NotBlank @Size(max = 2000) String body) {}
    public record Message(String id, UUID senderId, String senderName, String body, Instant sentAt) {}
    public record MessagePage(List<Message> items, boolean hasOlder) {}
}
