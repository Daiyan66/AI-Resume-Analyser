package com.airesume.ats.identity;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;

public final class OrganizationTestAccess {
    private OrganizationTestAccess() {}

    public static void provisionExistingAdmin(JdbcTemplate jdbc, MockHttpSession session) {
        var context = (SecurityContext) session.getAttribute("SPRING_SECURITY_CONTEXT");
        var account = (AppPrincipal) context.getAuthentication().getPrincipal();
        UUID organization = UUID.randomUUID();
        jdbc.update("INSERT INTO organizations (id, slug, name) VALUES (?, ?, ?)",
                organization, "fixture-" + organization, "Existing test organization");
        jdbc.update("INSERT INTO memberships (organization_id, user_id, role) VALUES (?, ?, 'ADMIN')",
                organization, account.id());
        jdbc.update("INSERT INTO organization_policies (organization_id) VALUES (?)", organization);
    }
}
