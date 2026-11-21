package com.airesume.ats.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.airesume.ats.identity.OrganizationTestAccess;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.document-dir=target/test-documents", "management.health.mail.enabled=false",
        "app.notifications.email-enabled=true", "app.notifications.poll-ms=86400000"})
class PlatformWorkflowIntegrationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder encoder;
    @Autowired DeliveryService deliveries;
    @MockitoBean JavaMailSender mail;

    @Test
    void hiringOperationsStayScopedAndReachTheCandidate() throws Exception {
        var admin = session("admin");
        var candidate = session("candidate");
        var outsider = session("outsider");
        var organization = org(admin, "hiring");
        var otherOrg = org(outsider, "outside");
        var job = id(mvc.perform(payload(post(organization + "/jobs"), admin, Map.of(
                "title", "Java Engineer", "location", "Remote", "workType", "REMOTE",
                "description", "Build Spring services", "requirements", "Java",
                "criteria", List.of(Map.of("description", "Spring services", "importance", "REQUIRED")))))
                .andExpect(status().isCreated()).andReturn(), "id");
        var listing = organization + "/jobs/" + job;
        mvc.perform(post(listing + "/publish").session(admin).with(csrf())).andExpect(status().isOk());
        mvc.perform(get("/api/v1/public/jobs").param("q", "Java Engineer").param("workType", "ONSITE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/public/jobs").param("q", "Build Spring services").param("workType", "REMOTE"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.id == '" + job + "')]").isNotEmpty());
        mvc.perform(payload(put("/api/v1/candidate/profile"), candidate, Map.of("headline", "Engineer",
                "location", "Remote", "phone", "", "summary", "Builds services", "skills", "Spring services",
                "experience", "", "education", ""))).andExpect(status().isOk());
        String document = upload(candidate, "application.txt", "Built Spring services for a small team.");
        String application = id(mvc.perform(payload(post("/api/v1/candidate/applications"), candidate,
                Map.of("jobId", job, "documentId", document))).andExpect(status().isCreated()).andReturn(), "id");
        var candidateApplication = "/api/v1/candidate/applications/" + application;
        var reviewPath = listing + "/applications/" + application;

        mvc.perform(payload(post(reviewPath + "/stage"), admin, Map.of("status", "IN_REVIEW"))).andExpect(status().isOk());
        var schedule = Map.of("startsAt", Instant.now().plusSeconds(3600).toString(), "timezone", "Asia/Kolkata",
                "location", "Online", "message", "Bring a work sample");
        mvc.perform(payload(post(reviewPath + "/interviews"), outsider, schedule)).andExpect(status().isForbidden());
        String interview = id(mvc.perform(payload(post(reviewPath + "/interviews"), admin, schedule))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(payload(post(reviewPath + "/interviews"), admin, schedule)).andExpect(status().isConflict());
        mvc.perform(get(candidateApplication + "/interviews").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].location").value("Online"));
        mvc.perform(get(candidateApplication + "/interviews").session(outsider)).andExpect(status().isNotFound());
        mvc.perform(delete(reviewPath + "/interviews/" + interview).session(admin).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(candidateApplication + "/interviews").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].cancelledAt").isNotEmpty());
        mvc.perform(get(reviewPath + "/evidence").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].excerpt").value("Built Spring services for a small team."));
        mvc.perform(get(candidateApplication + "/coaching").session(outsider)).andExpect(status().isNotFound());
        mvc.perform(get(candidateApplication + "/coaching").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].profileExcerpt").value("Spring services"));
        mvc.perform(get("/api/v1/documents/" + document + "/text").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.text").value("Built Spring services for a small team."));
        mvc.perform(get("/api/v1/documents/" + document + "/text").session(outsider)).andExpect(status().isNotFound());
        mvc.perform(get(organization + "/applications").param("status", "IN_REVIEW").param("q", "Java Engineer").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get(organization + "/reports/pipeline").param("jobId", job).session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.byStage.IN_REVIEW").value(1));
        mvc.perform(get(otherOrg + "/reports/pipeline").param("jobId", job).session(outsider)).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/documents/" + document).session(candidate).with(csrf())).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/candidate/notifications/read-all").session(candidate).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.markedRead").value(3));
        mvc.perform(get("/api/v1/candidate/notifications").param("read", "false").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));

        String dataRequest = id(mvc.perform(post("/api/v1/candidate/deletion-requests").session(candidate).with(csrf()))
                .andExpect(status().isAccepted()).andReturn(), "id");
        var dataReview = Map.of("outcome", "ELIGIBLE_FOR_REMOVAL", "reason", "Organization retention period elapsed");
        mvc.perform(payload(put(otherOrg + "/data-requests/" + dataRequest + "/review"), outsider, dataReview))
                .andExpect(status().isNotFound());
        mvc.perform(payload(put(organization + "/data-requests/" + dataRequest + "/review"), admin, dataReview))
                .andExpect(status().isOk()).andExpect(jsonPath("$.outcome").value("ELIGIBLE_FOR_REMOVAL"));
        mvc.perform(get("/api/v1/candidate/deletion-requests").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].status").value("PENDING"));

        UUID notification = jdbc.queryForObject("SELECT notification_id FROM notification_deliveries d " +
                "JOIN candidate_notifications n ON n.id = d.notification_id WHERE n.application_id = ? " +
                "ORDER BY d.notification_id LIMIT 1", UUID.class, UUID.fromString(application));
        doThrow(new MailSendException("test failed SMTP")).when(mail).send(any(SimpleMailMessage.class));
        jdbc.update("UPDATE notification_deliveries SET attempts = 2 WHERE notification_id = ?", notification);
        deliveries.dispatch();
        mvc.perform(get(organization + "/notification-deliveries").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == '" + notification + "')].status").value("FAILED"));
        mvc.perform(post(otherOrg + "/notification-deliveries/" + notification + "/retry").session(outsider).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post(organization + "/notification-deliveries/" + notification + "/retry").session(admin).with(csrf()))
                .andExpect(status().isAccepted());
        reset(mail);
        deliveries.dispatch();
        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(sent.capture());
        assertThat(sent.getValue().getText()).doesNotContain("Bring a work sample", "Spring services");
        for (String state : List.of("PAUSED", "CLOSED", "ARCHIVED")) {
            mvc.perform(payload(post(listing + "/status"), admin, Map.of("status", state)))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.status").value(state));
        }
        mvc.perform(get("/api/v1/public/jobs/" + job)).andExpect(status().isNotFound());
    }

    @Test
    void verifiesRecruiterMembershipAndProcessesAuthorizedFiles() throws Exception {
        var admin = session("platform-owner");
        var candidate = session("platform-recruiter");
        var outsider = session("platform-outsider");
        String slug = "screening-" + UUID.randomUUID();
        String organization = createOrg(admin, slug);
        String document = upload(candidate, "verification.txt", "Example corporate proof.");
        var requestBody = Map.of("organizationSlug", slug, "documentId", document, "designation", "Recruiter");
        mvc.perform(payload(post("/api/v1/recruiter-access-requests"), outsider, requestBody)).andExpect(status().isBadRequest());
        String request = id(mvc.perform(payload(post("/api/v1/recruiter-access-requests"), candidate, requestBody))
                .andExpect(status().isCreated()).andReturn(), "id");
        String path = organization + "/recruiter-access-requests/" + request;
        mvc.perform(get(path + "/document").session(outsider)).andExpect(status().isForbidden());
        mvc.perform(get(path + "/document").session(admin)).andExpect(status().isOk());
        mvc.perform(payload(put(path + "/decision"), admin, Map.of("outcome", "APPROVED")))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("APPROVED"));
        mvc.perform(get("/api/v1/me/workspaces").session(candidate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.organizations[0].role").value("RECRUITER"));
        String member = id(mvc.perform(get("/api/v1/me").session(candidate)).andExpect(status().isOk()).andReturn(), "id");
        String rolePath = organization + "/members/" + member + "/role";
        mvc.perform(payload(put(rolePath), candidate, Map.of("role", "ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(payload(put(rolePath), admin, Map.of("role", "ADMIN"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("ADMIN"));
        mvc.perform(payload(put(rolePath), admin, Map.of("role", "RECRUITER"))).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("RECRUITER"));
        mvc.perform(delete("/api/v1/documents/" + document).session(candidate).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(multipart(organization + "/jobs/import-draft").file(file("file", "Java_Engineer.txt", "Spring services"))
                        .session(candidate).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.description").value("Spring services"));
        String job = id(mvc.perform(payload(post(organization + "/jobs"), admin, Map.of("title", "Java Engineer",
                        "location", "Remote", "workType", "REMOTE", "description", "Job for a Java engineer", "requirements", "Spring",
                        "criteria", List.of(Map.of("description", "Spring services", "importance", "REQUIRED")))))
                .andExpect(status().isCreated()).andReturn(), "id");
        String batches = organization + "/jobs/" + job + "/screening-batches";
        String batch = id(mvc.perform(multipart(batches)
                .file(file("files", "valid.txt", "Built Spring services."))
                .file(file("files", "invalid.pdf", "Not a PDF")).session(candidate).with(csrf()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items[?(@.state == 'UNREADABLE')]").isNotEmpty())
                .andExpect(jsonPath("$.items[?(@.state == 'READY')].evidence[0].excerpt").value("Built Spring services."))
                .andReturn(), "id");
        mvc.perform(get(batches + "/" + batch).session(outsider)).andExpect(status().isForbidden());
        mvc.perform(delete(batches + "/" + batch).session(candidate).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(batches + "/" + batch).session(admin)).andExpect(status().isNotFound());
    }

    private String org(MockHttpSession admin, String prefix) throws Exception {
        return createOrg(admin, prefix + "-" + UUID.randomUUID());
    }

    private String createOrg(MockHttpSession admin, String slug) throws Exception {
        OrganizationTestAccess.provisionExistingAdmin(jdbc, admin);
        return "/api/v1/organizations/" + id(mvc.perform(payload(post("/api/v1/organizations"), admin,
                Map.of("slug", slug, "name", "Workflow test organization"))).andExpect(status().isCreated()).andReturn(), "organizationId");
    }

    private MockHttpSession session(String name) throws Exception {
        String email = name + "-" + UUID.randomUUID() + "@example.test";
        String pass = "Integration-password-01";
        jdbc.update("INSERT INTO users (id, email, display_name, password_hash, email_verified_at) " +
                "VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)", UUID.randomUUID(), email, name, encoder.encode(pass));
        return (MockHttpSession) mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", pass))))
                .andExpect(status().isOk()).andReturn().getRequest().getSession(false);
    }

    private String upload(MockHttpSession owner, String name, String text) throws Exception {
        return id(mvc.perform(multipart("/api/v1/documents").file(file("file", name, text)).session(owner).with(csrf()))
                .andExpect(status().isCreated()).andReturn(), "id");
    }

    private static MockMultipartFile file(String name, String filename, String text) {
        return new MockMultipartFile(name, filename, "text/plain", text.getBytes(StandardCharsets.UTF_8));
    }

    private MockHttpServletRequestBuilder payload(MockHttpServletRequestBuilder request, MockHttpSession session,
                                                  Map<String, ?> body) throws Exception {
        return request.session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
    }

    private String id(MvcResult result, String key) throws Exception {
        return json.readTree(result.getResponse().getContentAsString()).get(key).asText();
    }
}
