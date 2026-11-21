package com.airesume.ats.recruiter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airesume.ats.identity.OrganizationTestAccess;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.document-dir=target/test-documents", "management.health.mail.enabled=false"})
class RecruiterFlowIntegrationTest {
    private static final String PASSWORD = "Recruiter-Test-Password-123";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;

    @Test
    void scopedPipelineReviewsDecisionsAndCandidateStatusesWorkTogether() throws Exception {
        Account owner = account("owner");
        Account candidate = account("candidate");
        Account outsider = account("outsider");
        OrganizationTestAccess.provisionExistingAdmin(jdbc, owner.session());
        String organizationId = id(mvc.perform(post("/api/v1/organizations").session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("name", "Recruiter Test",
                        "slug", "recruiter-" + UUID.randomUUID())))).andExpect(status().isCreated()).andReturn(), "organizationId");
        String jobId = id(mvc.perform(post("/api/v1/organizations/{id}/jobs", organizationId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(jobBody("Draft")))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(put("/api/v1/organizations/{orgId}/jobs/{jobId}", organizationId, jobId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(jobBody("Final")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.title").value("Final"));
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/publish", organizationId, jobId)
                .session(owner.session()).with(csrf())).andExpect(status().isOk());
        mvc.perform(put("/api/v1/organizations/{orgId}/jobs/{jobId}", organizationId, jobId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(jobBody("Too late")))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/public/jobs/{id}", jobId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.criteria[0].guidance").doesNotExist());
        String criterionId = json.readTree(mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}", organizationId, jobId)
                .session(owner.session())).andReturn().getResponse().getContentAsString()).path("criteria").get(0).path("id").asText();

        mvc.perform(put("/api/v1/candidate/profile").session(candidate.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("headline", "Engineer", "location", "Remote",
                        "phone", "", "summary", "Builds software", "skills", "Java", "experience", "Work",
                        "education", "Degree")))).andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/status", organizationId, jobId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("status", "PAUSED")))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/jobs/{id}", jobId)).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/candidate/applications").session(candidate.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("jobId", jobId, "answers", Map.of()))))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/status", organizationId, jobId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("status", "PUBLISHED")))).andExpect(status().isOk());
        MockMultipartFile file = new MockMultipartFile("file", "resume.txt", "text/plain",
                "candidate resume".getBytes(StandardCharsets.UTF_8));
        String documentId = id(mvc.perform(multipart("/api/v1/documents").file(file)
                .session(candidate.session()).with(csrf())).andExpect(status().isCreated()).andReturn(), "id");
        String applicationId = id(mvc.perform(post("/api/v1/candidate/applications")
                .session(candidate.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "documentId", documentId, "answers", Map.of()))))
                .andExpect(status().isCreated()).andReturn(), "id");

        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications", organizationId, jobId)
                .session(outsider.session())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}",
                organizationId, jobId, applicationId).session(outsider.session())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/document",
                organizationId, jobId, applicationId).session(outsider.session())).andExpect(status().isForbidden());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/document",
                organizationId, jobId, applicationId).session(owner.session())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications", organizationId, jobId)
                .session(owner.session())).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/decisions",
                organizationId, jobId, applicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("outcome", "NOT_SELECTED",
                        "reason", "Private decision reason")))).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/stage",
                organizationId, jobId, applicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("status", "IN_REVIEW"))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/decisions",
                organizationId, jobId, applicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("outcome", "NOT_SELECTED",
                        "reason", "Private decision reason")))).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/reviews",
                organizationId, jobId, applicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("criterionId", criterionId,
                        "rating", "MET", "note", "Evidence from submitted profile"))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/decisions",
                organizationId, jobId, applicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("outcome", "NOT_SELECTED",
                        "reason", "Private decision reason")))).andExpect(status().isOk())
                .andExpect(jsonPath("$.decisions[0].reason").value("Private decision reason"));
        MvcResult candidateView = mvc.perform(get("/api/v1/candidate/applications/{id}", applicationId)
                .session(candidate.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("NOT_SELECTED"))
                .andExpect(jsonPath("$.events.length()").value(3)).andReturn();
        assertThat(candidateView.getResponse().getContentAsString()).doesNotContain("Private decision reason");
        MvcResult inbox = mvc.perform(get("/api/v1/candidate/notifications").session(candidate.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].message").value("Your application status changed to Not selected."))
                .andReturn();
        String notificationId = json.readTree(inbox.getResponse().getContentAsString()).path("items").get(0)
                .path("id").asText();
        mvc.perform(post("/api/v1/candidate/notifications/{id}/read", notificationId)
                .session(outsider.session()).with(csrf())).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/candidate/notifications/{id}/read", notificationId)
                .session(candidate.session()).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));

        String secondApplicationId = id(mvc.perform(post("/api/v1/candidate/applications")
                .session(candidate.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of()))))
                .andExpect(status().isCreated()).andReturn(), "id");
        for (String stage : List.of("IN_REVIEW", "INTERVIEW", "OFFER")) {
            mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/stage",
                    organizationId, jobId, secondApplicationId).session(owner.session()).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("status", stage))))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/reviews",
                organizationId, jobId, secondApplicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("criterionId", criterionId,
                        "rating", "PARTIAL", "note", "Additional evidence discussed"))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/applications/{appId}/decisions",
                organizationId, jobId, secondApplicationId).session(owner.session()).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("outcome", "HIRED",
                        "reason", "Private hiring decision reason")))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/candidate/applications/{id}", secondApplicationId).session(candidate.session()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("HIRED"));
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/status", organizationId, jobId)
                .session(owner.session()).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("status", "CLOSED")))).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/jobs/{id}", jobId)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications", organizationId, jobId)
                .session(owner.session())).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2));

        jdbc.update("UPDATE memberships SET status = 'REVOKED' WHERE organization_id = ? AND user_id = ?",
                UUID.fromString(organizationId), owner.id());
        mvc.perform(get("/api/v1/organizations/{orgId}/jobs/{jobId}/applications", organizationId, jobId)
                .session(owner.session())).andExpect(status().isForbidden());
    }

    private Account account(String label) throws Exception {
        UUID id = UUID.randomUUID();
        String email = label + "-" + UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users (id, email, display_name, password_hash, email_verified_at) " +
                "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", id, email, label, encoder.encode(PASSWORD));
        MvcResult login = mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        return new Account(id, (MockHttpSession) login.getRequest().getSession(false));
    }

    private String jobBody(String title) throws Exception {
        return body(Map.of("title", title, "location", "Remote", "workType", "REMOTE",
                "description", "Build software", "requirements", "Java experience", "questions", List.of(),
                "criteria", List.of(Map.of("description", "Java experience", "importance", "REQUIRED",
                        "guidance", "Look at the submitted resume"))));
    }

    private String body(Object value) throws Exception { return json.writeValueAsString(value); }
    private String id(MvcResult result, String field) throws Exception {
        JsonNode value = json.readTree(result.getResponse().getContentAsString());
        return value.path(field).asText();
    }
    private record Account(UUID id, MockHttpSession session) {}
}
