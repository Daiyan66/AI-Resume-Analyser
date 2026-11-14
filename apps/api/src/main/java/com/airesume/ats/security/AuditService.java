package com.airesume.ats.security;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final JdbcTemplate jdbc;

    public AuditService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void record(UUID actor, UUID organization, String action, String targetType, UUID targetId) {
        jdbc.update("INSERT INTO audit_events (id, actor_user_id, organization_id, action, target_type, target_id) " +
                        "VALUES (?, ?, ?, ?, ?, ?)",
                UUID.randomUUID(), actor, organization, action, targetType, targetId);
    }
}
