package com.airesume.ats.candidate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.airesume.ats.identity.OrganizationTestAccess;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.document-dir=target/test-documents", "management.health.mail.enabled=false"})
class CandidateFlowIntegrationTest {
    private static final String PASSWORD = "Candidate-Test-Password-123";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;

    @Test
    void publishedJobsAndApplicationsRespectCandidateOwnership() throws Exception {
        MockHttpSession admin = account("admin");
        MockHttpSession candidate = account("candidate");
        MockHttpSession other = account("other");
        OrganizationTestAccess.provisionExistingAdmin(jdbc, admin);
        String orgId = id(mvc.perform(post("/api/v1/organizations").session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("name", "Candidate Flow Test", "slug", "candidate-" + UUID.randomUUID()))))
                .andExpect(status().isCreated()).andReturn(), "organizationId");

        mvc.perform(post("/api/v1/organizations/{id}/jobs", orgId).session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(jobBody()))
                .andExpect(status().isForbidden());
        String jobId = id(mvc.perform(post("/api/v1/organizations/{id}/jobs", orgId).session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(jobBody()))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(get("/api/v1/organizations/{id}/jobs", orgId).session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get("/api/v1/public/jobs/{id}", jobId)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/public/jobs")).andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{orgId}/jobs/{jobId}/publish", orgId, jobId)
                .session(admin).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/jobs/{id}", jobId)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mvc.perform(get("/api/v1/public/jobs?page=0&size=1")).andExpect(status().isOk())
                .andExpect(jsonPath("$.size").value(1))
                .andExpect(jsonPath("$.items[0].id").value(jobId));

        String questionId = json.readTree(mvc.perform(get("/api/v1/public/jobs/{id}", jobId))
                .andReturn().getResponse().getContentAsString()).path("questions").get(0).path("id").asText();
        mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of(questionId, "My answer")))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Add a headline and summary to your candidate profile before applying."));
        mvc.perform(put("/api/v1/candidate/profile").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(profile())))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of()))))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "documentId", UUID.randomUUID(),
                        "answers", Map.of(questionId, "My answer")))))
                .andExpect(status().isBadRequest());

        String applicationId = id(mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of(questionId, "My answer")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUBMITTED"))
                .andExpect(jsonPath("$.answers['" + questionId + "'].prompt").value("Why this role?"))
                .andReturn(), "id");
        mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of(questionId, "Again")))))
                .andExpect(status().isConflict());
        mvc.perform(put("/api/v1/candidate/profile").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("headline", "New headline",
                        "location", "Remote", "phone", "", "summary", "Updated summary",
                        "skills", "Java, SQL", "experience", "Three years", "education", "Degree"))))
                .andExpect(status().isOk());
        mvc.perform(get("/api/v1/candidate/applications/{id}", applicationId).session(candidate))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profileSnapshot.profile.headline").value("Candidate headline"));
        mvc.perform(get("/api/v1/candidate/applications/{id}", applicationId).session(other))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/candidate/applications").session(other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(post("/api/v1/candidate/applications/{id}/withdraw", applicationId).session(other).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/candidate/applications/{id}/withdraw", applicationId).session(candidate).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.events.length()").value(2));
        mvc.perform(get("/api/v1/candidate/applications").param("status", "WITHDRAWN").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(applicationId));
        mvc.perform(get("/api/v1/candidate/applications").param("status", "SUBMITTED").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0))
                .andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get("/api/v1/candidate/applications").param("status", "WITHDRAWN").session(other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/candidate/applications").param("status", "UNKNOWN").session(candidate))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/organizations/{id}/policy", orgId).session(candidate))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/organizations/{id}/policy", orgId).session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("reapplyCooldownDays", 30,
                        "retentionDays", 365, "aiEnabled", false))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reapplyCooldownDays").value(30));
        mvc.perform(post("/api/v1/organizations/{id}/ai/job-draft", orgId).session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("title", "Engineer", "facts", "Java role"))))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/organizations/{id}/policy", orgId).session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("reapplyCooldownDays", 30,
                        "retentionDays", 365, "aiEnabled", true))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/organizations/{id}/ai/job-draft", orgId).session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("title", "Engineer", "facts", "Java role"))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/organizations/{id}/ai/job-draft", orgId).session(admin).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("title", "Engineer", "facts", "Java role"))))
                .andExpect(status().isServiceUnavailable());
        mvc.perform(post("/api/v1/candidate/applications").session(candidate).with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("jobId", jobId, "answers", Map.of(questionId, "After withdrawal")))))
                .andExpect(status().isConflict());
    }

    @Test
    void exportAndDeletionRequestContainOnlyOwnCandidateData() throws Exception {
        MockHttpSession owner = account("export-owner");
        MockHttpSession other = account("export-other");
        mvc.perform(put("/api/v1/candidate/profile").session(owner).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(profile())))
                .andExpect(status().isOk());
        MvcResult export = mvc.perform(get("/api/v1/candidate/export").session(owner))
                .andExpect(status().isOk()).andReturn();
        assertThat(export.getResponse().getContentAsString()).contains("Candidate headline");
        mvc.perform(get("/api/v1/candidate/export").session(other)).andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.headline").value(""));
        MvcResult requested = mvc.perform(post("/api/v1/candidate/deletion-requests").session(owner).with(csrf()))
                .andExpect(status().isAccepted()).andReturn();
        String requestId = id(requested, "id");
        mvc.perform(post("/api/v1/candidate/deletion-requests").session(owner).with(csrf()))
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.id").value(requestId));
        mvc.perform(get("/api/v1/candidate/deletion-requests").session(other))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
    }

    private MockHttpSession account(String label) throws Exception {
        String email = label + "-" + UUID.randomUUID() + "@example.test";
        jdbc.update("INSERT INTO users (id, email, display_name, password_hash, email_verified_at) " +
                "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", UUID.randomUUID(), email, label, encoder.encode(PASSWORD));
        MvcResult login = mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) login.getRequest().getSession(false);
    }

    private Map<String, Object> profile() {
        return Map.of("headline", "Candidate headline", "location", "Remote", "phone", "", "summary", "Experience summary",
                "skills", "Java, SQL", "experience", "Three years", "education", "Degree");
    }

    private String jobBody() throws Exception {
        return body(Map.of("title", "Software Engineer", "location", "Remote", "workType", "REMOTE",
                "description", "Build useful software", "requirements", "Java and SQL",
                "questions", List.of(Map.of("prompt", "Why this role?", "required", true))));
    }

    private String body(Object value) throws Exception { return json.writeValueAsString(value); }
    private String id(MvcResult result, String field) throws Exception {
        JsonNode value = json.readTree(result.getResponse().getContentAsString());
        return value.path(field).asText();
    }
}
