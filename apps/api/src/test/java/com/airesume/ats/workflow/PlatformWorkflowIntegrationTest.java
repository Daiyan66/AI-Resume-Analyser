package com.airesume.ats.workflow;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.airesume.ats.ai.AiTextClient;
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
    @MockitoBean AiTextClient ai;

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
        mvc.perform(get(organization + "/jobs").param("q", "Spring services").param("status", "PUBLISHED")
                        .param("workType", "REMOTE").session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].id").value(job));
        mvc.perform(get(organization + "/jobs").param("status", "DRAFT").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get(organization + "/applications/jobs").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(job));
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
        String recruiterNotifications = organization + "/recruiter-notifications";
        mvc.perform(get(recruiterNotifications).param("unread", "true").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].applicationId").value(application));
        mvc.perform(put(recruiterNotifications + "/submitted-" + application + "/read").session(outsider).with(csrf()))
                .andExpect(status().isForbidden());
        mvc.perform(put(recruiterNotifications + "/submitted-" + application + "/read").session(admin).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get(recruiterNotifications).param("unread", "true").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get(organization + "/reports/pipeline").param("jobId", job).session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.byStage.IN_REVIEW").value(1))
                .andExpect(jsonPath("$.weeklyApplications.length()").value(8))
                .andExpect(jsonPath("$.weeklyApplications[7].applications").value(1));
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
        jdbc.update("UPDATE notification_deliveries SET attempts = 2, next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '1 day' " +
                "WHERE notification_id = ?", notification);
        deliveries.dispatch();
        mvc.perform(get(organization + "/notification-deliveries").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$[?(@.id == '" + notification + "')].status").value("FAILED"));
        mvc.perform(post(otherOrg + "/notification-deliveries/" + notification + "/retry").session(outsider).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post(organization + "/notification-deliveries/" + notification + "/retry").session(admin).with(csrf()))
                .andExpect(status().isAccepted());
        reset(mail);
        jdbc.update("UPDATE notification_deliveries SET next_attempt_at = CURRENT_TIMESTAMP - INTERVAL '1 day' WHERE notification_id = ?",
                notification);
        deliveries.dispatch();
        mvc.perform(get(organization + "/notification-deliveries").session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == '" + notification + "')].status").value("SENT"));
        ArgumentCaptor<SimpleMailMessage> sent = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(sent.capture());
        assertThat(sent.getAllValues()).allSatisfy(message ->
                assertThat(message.getText()).doesNotContain("Bring a work sample", "Spring services"));
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

    @Test
    void teamChatScopesRoomsAndDirectMessagesToActiveMembers() throws Exception {
        var admin = session("chat-admin");
        var recruiter = session("chat-recruiter");
        var teammate = session("chat-teammate");
        var outsider = session("chat-outsider");
        var organization = org(admin, "chat");
        var otherOrg = org(outsider, "other-chat");
        UUID orgId = UUID.fromString(organization.substring(organization.lastIndexOf('/') + 1));
        String adminId = id(mvc.perform(get("/api/v1/auth/session").session(admin)).andReturn(), "id");
        String recruiterId = id(mvc.perform(get("/api/v1/auth/session").session(recruiter)).andReturn(), "id");
        String teammateId = id(mvc.perform(get("/api/v1/auth/session").session(teammate)).andReturn(), "id");
        String outsiderId = id(mvc.perform(get("/api/v1/auth/session").session(outsider)).andReturn(), "id");
        for (String member : List.of(recruiterId, teammateId)) {
            jdbc.update("INSERT INTO memberships (organization_id, user_id, role) VALUES (?, ?, 'RECRUITER')",
                    orgId, UUID.fromString(member));
        }
        String messages = organization + "/chat/messages";
        mvc.perform(get(organization + "/chat/people").session(recruiter))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get(messages).session(outsider)).andExpect(status().isForbidden());
        mvc.perform(payload(post(messages), admin, Map.of("person", outsiderId, "body", "Outside message")))
                .andExpect(status().isNotFound());
        String roomId = id(mvc.perform(payload(post(messages), admin, Map.of("body", "Hiring team update")))
                .andExpect(status().isCreated()).andReturn(), "id");
        String directId = id(mvc.perform(payload(post(messages), recruiter, Map.of("person", adminId, "body", "Private note")))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(get(messages).session(recruiter)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].id").value(roomId));
        mvc.perform(get(messages).param("person", recruiterId).session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].id").value(directId));
        mvc.perform(get(messages).param("person", recruiterId).param("after", roomId).session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].body").value("Private note"));
        mvc.perform(get(messages).param("person", recruiterId).param("before", directId).session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        mvc.perform(get(messages).param("person", recruiterId).session(teammate))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        String notifications = organization + "/recruiter-notifications";
        mvc.perform(get(notifications).session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].personId").value(recruiterId));
        mvc.perform(get(notifications).session(teammate)).andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1)).andExpect(jsonPath("$.items[0].key").value("chat-" + roomId));
        mvc.perform(put(notifications + "/chat-" + directId + "/read").session(teammate).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(get(otherOrg + "/chat/messages").session(outsider))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        jdbc.update("UPDATE memberships SET status = 'REVOKED' WHERE organization_id = ? AND user_id = ?", orgId,
                UUID.fromString(recruiterId));
        mvc.perform(get(messages).session(recruiter)).andExpect(status().isForbidden());
        mvc.perform(payload(post(messages), admin, Map.of("person", recruiterId, "body", "After removal")))
                .andExpect(status().isNotFound());
    }

    @Test
    void interviewsAndAssessmentsRespectCalendarsApplicationOwnershipAndHumanReview() throws Exception {
        var admin = session("workflow-admin");
        var first = session("workflow-candidate-one");
        var second = session("workflow-candidate-two");
        String org = org(admin, "assess-interview");
        String job = id(mvc.perform(payload(post(org + "/jobs"), admin, Map.of(
                "title", "Accessibility Reviewer", "location", "Remote", "workType", "REMOTE",
                "description", "Review keyboard accessibility", "requirements", "Keyboard testing")))
                .andExpect(status().isCreated()).andReturn(), "id");
        String listing = org + "/jobs/" + job;
        mvc.perform(post(listing + "/publish").session(admin).with(csrf())).andExpect(status().isOk());
        String firstApp = workflowApplication(first, admin, listing, job);
        String secondApp = workflowApplication(second, admin, listing, job);
        mvc.perform(get(org + "/applications").param("sort", "oldest").param("size", "1").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(firstApp));
        mvc.perform(get(org + "/applications").param("sort", "oldest").param("size", "1").param("page", "1").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[0].id").value(secondApp));
        mvc.perform(get(org + "/applications").param("hiringStep", "assessments").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get(org + "/applications").param("hiringStep", "interviews").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        mvc.perform(get("/api/v1/candidate/hiring-applications").session(first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(0));
        String firstInterview = "/api/v1/candidate/applications/" + firstApp + "/interviews";
        String secondInterview = "/api/v1/candidate/applications/" + secondApp + "/interviews";
        var starts = Instant.now().plusSeconds(7200);
        var slots = Map.of("times", List.of(starts, starts.plusSeconds(5400)), "minutes", 30,
                "timezone", "Asia/Kolkata", "location", "https://example.test/meeting", "message", "Bring your notes.");
        for (String app : List.of(firstApp, secondApp)) {
            mvc.perform(payload(put(listing + "/applications/" + app + "/interviews/offer"), admin, slots))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/v1/candidate/hiring-tasks").session(first))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].kind").value("interview_booking"));
        mvc.perform(get(firstInterview + "/offer").session(second)).andExpect(status().isNotFound());
        String leftSlot = firstSlot(firstInterview, first);
        String rightSlot = firstSlot(secondInterview, second);
        try (var pool = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var gate = new java.util.concurrent.CountDownLatch(1);
            var left = pool.submit(() -> {
                gate.await();
                return mvc.perform(post(firstInterview + "/book/" + leftSlot).session(first).with(csrf()))
                        .andReturn().getResponse().getStatus();
            });
            var right = pool.submit(() -> {
                gate.await();
                return mvc.perform(post(secondInterview + "/book/" + rightSlot).session(second).with(csrf()))
                        .andReturn().getResponse().getStatus();
            });
            gate.countDown();
            assertThat(List.of(left.get(10, java.util.concurrent.TimeUnit.SECONDS), right.get(10, java.util.concurrent.TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
            boolean firstBooked = left.get() == 200;
            var winner = firstBooked ? first : second;
            String winnerApp = firstBooked ? firstApp : secondApp;
            String winnerEndpoint = firstBooked ? firstInterview : secondInterview;
            mvc.perform(get((firstBooked ? secondInterview : firstInterview) + "/offer").session(firstBooked ? second : first))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.slots.length()").value(1));
            String interview = json.readTree(mvc.perform(get(winnerEndpoint).session(winner)).andReturn()
                    .getResponse().getContentAsString()).get(0).get("id").asText();
            mvc.perform(post(winnerEndpoint + "/" + interview + "/reschedule").session(winner).with(csrf()))
                    .andExpect(status().isNoContent());
            mvc.perform(payload(put(listing + "/applications/" + winnerApp + "/interviews/offer"), admin,
                    Map.of("times", List.of(starts.plusSeconds(14400)), "minutes", 30, "timezone", "UTC",
                            "location", "https://example.test/replacement", "message", ""))).andExpect(status().isOk());
            mvc.perform(get(winnerEndpoint).session(winner)).andExpect(jsonPath("$[0].cancelledAt").isEmpty());
            String replacement = id(mvc.perform(post(winnerEndpoint + "/book/" + firstSlot(winnerEndpoint, winner))
                            .session(winner).with(csrf())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.location").value("https://example.test/replacement")).andReturn(), "id");
            mvc.perform(delete(listing + "/applications/" + winnerApp + "/interviews/" + replacement).session(admin).with(csrf()))
                    .andExpect(status().isNoContent());
        }

        String templates = listing + "/assessment-templates";
        String staff = org + "/applications/" + firstApp + "/assessments";
        String candidate = "/api/v1/candidate/applications/" + firstApp + "/assessments";
        var draft = Map.of("title", "Keyboard review", "instructions", "Review a signup form.", "effortMinutes", 20,
                "allowedTools", "Documentation is allowed.", "rubric", List.of("Tab order", "Focus visibility"));
        String template = id(mvc.perform(payload(post(templates), admin, draft)).andExpect(status().isOk()).andReturn(), "id");
        Instant due = Instant.now().plusSeconds(86400);
        var assign = Map.of("templateId", template, "availableFrom", Instant.now().plusSeconds(3600), "dueAt", due);
        mvc.perform(payload(post(staff), admin, assign)).andExpect(status().isConflict());
        mvc.perform(post(templates + "/" + template + "/publish").session(admin).with(csrf())).andExpect(status().isOk());
        mvc.perform(payload(put(templates + "/" + template), admin, draft)).andExpect(status().isConflict());
        String assignment = id(mvc.perform(payload(post(staff), admin, assign)).andExpect(status().isOk()).andReturn(), "id");
        mvc.perform(get("/api/v1/candidate/notifications").session(first))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[?(@.message =~ /An assessment was assigned.*/)]").isNotEmpty());
        mvc.perform(get(candidate).session(second)).andExpect(status().isNotFound());
        String progress = "/api/v1/candidate/hiring-applications";
        mvc.perform(get(progress).session(first)).andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].nextKind").value("assessment_scheduled"));
        mvc.perform(get(progress + "/" + firstApp).session(second)).andExpect(status().isNotFound());
        mvc.perform(get(candidate).session(first)).andExpect(status().isOk()).andExpect(jsonPath("$[0].instructions").value(""));
        mvc.perform(payload(put(listing + "/applications/" + firstApp + "/interviews/offer"), admin, slots))
                .andExpect(status().isConflict());
        mvc.perform(payload(post(listing + "/applications/" + firstApp + "/stage"), admin, Map.of("status", "INTERVIEW")))
                .andExpect(status().isConflict());
        String attachment = upload(first, "work.txt", "A written test plan.");
        var answer = Map.of("answer", "I tested the tab order with a keyboard.", "documentId", attachment, "aiConsent", true);
        mvc.perform(payload(put(candidate + "/" + assignment + "/draft"), first, answer)).andExpect(status().isConflict());
        jdbc.update("UPDATE assessment_assignments SET available_from = CURRENT_TIMESTAMP - INTERVAL '1 minute' WHERE id = ?",
                UUID.fromString(assignment));
        mvc.perform(payload(put(candidate + "/" + assignment + "/draft"), first, answer)).andExpect(status().isOk());
        mvc.perform(get(staff).session(admin)).andExpect(jsonPath("$[0].answer").value(""));
        mvc.perform(get(staff + "/" + assignment + "/attachment").session(admin)).andExpect(status().isNotFound());
        mvc.perform(post(staff + "/" + assignment + "/evidence").session(admin).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(payload(post(candidate + "/" + assignment + "/submit"), first, answer)).andExpect(status().isOk())
                .andExpect(jsonPath("$.submittedAt").isNotEmpty());
        mvc.perform(payload(put(candidate + "/" + assignment + "/draft"), first, answer)).andExpect(status().isConflict());
        mvc.perform(get(staff + "/" + assignment + "/attachment").session(admin)).andExpect(status().isOk());
        mvc.perform(get(org + "/hiring-tasks").session(admin)).andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.kind == 'assessment_review')]").isNotEmpty());
        mvc.perform(post(staff + "/" + assignment + "/evidence").session(admin).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(payload(put(org + "/policy"), admin,
                Map.of("reapplyCooldownDays", 0, "retentionDays", 365, "aiEnabled", true))).andExpect(status().isOk());
        when(ai.complete(startsWith("Treat all input"), any(), eq(1400))).thenReturn("""
                [{"index":0,"excerpt":"tested the tab order","followUp":"What was your method?"},
                 {"index":1,"excerpt":"invented text","followUp":"How did you check focus?"}]
                """);
        mvc.perform(post(staff + "/" + assignment + "/evidence").session(admin).with(csrf())).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].excerpt").value("tested the tab order"))
                .andExpect(jsonPath("$[1].excerpt").value(""));
        mvc.perform(payload(post(staff + "/" + assignment + "/review"), admin,
                Map.of("scores", List.of(4, 2), "feedback", "Confirm the focus indicator.", "outcome", "RETRY"))).andExpect(status().isOk());
        mvc.perform(get(candidate).session(first)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].feedback").value("Confirm the focus indicator."));
        mvc.perform(get(progress + "/" + firstApp).session(first)).andExpect(jsonPath("$.nextKind").value("assessment_retry"));
        mvc.perform(payload(put(listing + "/applications/" + firstApp + "/interviews/offer"), admin, slots))
                .andExpect(status().isConflict());
        String retry = id(mvc.perform(payload(post(staff), admin, Map.of("templateId", template, "dueAt", due)))
                .andExpect(status().isOk()).andReturn(), "id");
        mvc.perform(payload(post(candidate + "/" + retry + "/submit"), first, answer)).andExpect(status().isOk());
        mvc.perform(payload(post(staff + "/" + retry + "/review"), admin,
                Map.of("scores", List.of(4, 4), "feedback", "Clear focus testing.", "outcome", "PASSED"))).andExpect(status().isOk());
        mvc.perform(get(progress + "/" + firstApp).session(first)).andExpect(jsonPath("$.nextKind").value("interview_pending"));
        mvc.perform(payload(put(listing + "/applications/" + firstApp + "/interviews/offer"), admin, slots))
                .andExpect(status().isOk());
        mvc.perform(get(progress + "/" + firstApp).session(first)).andExpect(jsonPath("$.nextKind").value("interview_booking"));
        mvc.perform(get(org + "/applications").param("hiringStep", "interviews").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.id == '%s')]", firstApp).isNotEmpty());
        mvc.perform(get(org + "/applications").param("hiringStep", "assessments").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.items[?(@.id == '%s')]", firstApp).isEmpty());

        String secondJob = id(mvc.perform(payload(post(org + "/jobs"), admin, Map.of(
                "title", "QA Reviewer", "location", "Remote", "workType", "REMOTE",
                "description", "Review QA workflows", "requirements", "Interface testing")))
                .andExpect(status().isCreated()).andReturn(), "id");
        String secondListing = org + "/jobs/" + secondJob;
        mvc.perform(post(secondListing + "/publish").session(admin).with(csrf())).andExpect(status().isOk());
        String queueApp = workflowApplication(first, admin, secondListing, secondJob);
        String queueTemplates = secondListing + "/assessment-templates";
        String queueTemplate = id(mvc.perform(payload(post(queueTemplates), admin, draft))
                .andExpect(status().isOk()).andReturn(), "id");
        mvc.perform(post(queueTemplates + "/" + queueTemplate + "/publish").session(admin).with(csrf()))
                .andExpect(status().isOk());
        mvc.perform(payload(post(org + "/applications/" + queueApp + "/assessments"), admin,
                Map.of("templateId", queueTemplate, "dueAt", due))).andExpect(status().isOk());
        mvc.perform(get(org + "/applications").param("hiringStep", "assessments").param("size", "1").session(admin))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(queueApp));
        mvc.perform(get(progress).param("size", "1").session(first))
                .andExpect(status().isOk()).andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[0].id").value(queueApp));
    }

    private String workflowApplication(MockHttpSession candidate, MockHttpSession admin, String listing, String job) throws Exception {
        mvc.perform(payload(put("/api/v1/candidate/profile"), candidate, Map.of("headline", "Reviewer", "location", "",
                "phone", "", "summary", "Tests interfaces", "skills", "", "experience", "", "education", "")))
                .andExpect(status().isOk());
        String id = id(mvc.perform(payload(post("/api/v1/candidate/applications"), candidate, Map.of("jobId", job)))
                .andExpect(status().isCreated()).andReturn(), "id");
        mvc.perform(payload(post(listing + "/applications/" + id + "/stage"), admin, Map.of("status", "IN_REVIEW")))
                .andExpect(status().isOk());
        return id;
    }

    private String firstSlot(String interviews, MockHttpSession session) throws Exception {
        return json.readTree(mvc.perform(get(interviews + "/offer").session(session)).andExpect(status().isOk()).andReturn()
                .getResponse().getContentAsString()).get("slots").get(0).get("id").asText();
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
