package com.airesume.ats.workflow;

import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class AssessmentGate {
    private final JdbcTemplate jdbc;

    public AssessmentGate(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void requirePassed(UUID application) {
        boolean blocked = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (SELECT 1 FROM latest_assessment_attempts
                  WHERE application_id = ? AND outcome IS DISTINCT FROM 'PASSED')
                """, Boolean.class, application));
        if (blocked) throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Record a passing outcome for each assigned assessment before proceeding to interview.");
    }
}
