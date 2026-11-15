package com.airesume.ats.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {"app.document-dir=target/test-documents", "management.health.mail.enabled=false"})
class IdentityAccessIntegrationTest {
    private static final String PASSWORD = "A-Strong-Test-Password-123";

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @MockitoBean JavaMailSender mail;

    @Test
    void emailFailureIsReportedAndRegistrationCanBeRetried() throws Exception {
        String email = "mail-failure-" + UUID.randomUUID() + "@example.test";
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(SimpleMailMessage.class));
        try {
            mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content(body(Map.of("email", email, "displayName", "Test User", "password", PASSWORD))))
                    .andExpect(status().isServiceUnavailable());
        } finally {
            reset(mail);
        }
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "displayName", "Test User", "password", PASSWORD))))
                .andExpect(status().isCreated());
    }

    @Test
    void verificationEmailCanBeResentAfterInboxIsCleared() throws Exception {
        String email = "resend-" + UUID.randomUUID() + "@example.test";
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "displayName", "Test User", "password", PASSWORD))))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/resend-verification").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email)))).andExpect(status().isAccepted());
        ArgumentCaptor<SimpleMailMessage> emails = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, times(2)).send(emails.capture());
        String oldToken = emails.getAllValues().get(0).getText().split("/\\?verify=")[1].split("\\s")[0];
        String newToken = emails.getAllValues().get(1).getText().split("/\\?verify=")[1].split("\\s")[0];
        mvc.perform(post("/api/v1/auth/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", oldToken)))).andExpect(status().isGone());
        mvc.perform(post("/api/v1/auth/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", newToken)))).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/resend-verification").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email)))).andExpect(status().isAccepted());
        mvc.perform(post("/api/v1/auth/resend-verification").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", "missing@example.test")))).andExpect(status().isAccepted());
        verify(mail, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void sessionsCsrfAndOrganizationRolesAreEnforced() throws Exception {
        mvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/session")).andExpect(status().isNoContent());
        String firstEmail = "owner-" + UUID.randomUUID() + "@example.test";
        String secondEmail = "recruiter-" + UUID.randomUUID() + "@example.test";
        mvc.perform(post("/api/v1/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", firstEmail, "displayName", "Owner", "password", PASSWORD))))
                .andExpect(status().isForbidden());

        register(firstEmail);
        register(secondEmail);
        MockHttpSession owner = login(firstEmail);
        MockHttpSession recruiter = login(secondEmail);
        mvc.perform(get("/api/v1/auth/session").session(owner)).andExpect(status().isOk());

        String slug = "first-" + UUID.randomUUID();
        MvcResult created = mvc.perform(post("/api/v1/organizations").session(owner).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("slug", slug, "name", "First Hiring Team"))))
                .andExpect(status().isCreated()).andReturn();
        String firstOrgId = json.readTree(created.getResponse().getContentAsString()).path("organizationId").asText();

        String otherSlug = "other-" + UUID.randomUUID();
        mvc.perform(post("/api/v1/organizations").session(recruiter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("slug", otherSlug, "name", "Other Team"))))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/organizations/{id}/members", firstOrgId).session(recruiter))
                .andExpect(status().isForbidden());

        mvc.perform(post("/api/v1/organizations/{id}/invitations", firstOrgId).session(owner).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("email", secondEmail, "role", "RECRUITER"))))
                .andExpect(status().isCreated());
        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(mailCaptor.capture());
        String inviteBody = mailCaptor.getAllValues().stream().map(SimpleMailMessage::getText)
                .filter(text -> text != null && text.contains("/invite?token=")).findFirst().orElseThrow();
        assertThat(inviteBody).isNotNull();
        String token = inviteBody.split("/invite\\?token=")[1].split("\\s")[0];

        mvc.perform(post("/api/v1/invitations/accept").session(owner).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("token", token))))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/invitations/accept").session(recruiter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("token", token))))
                .andExpect(status().isOk());
        mvc.perform(post("/api/v1/invitations/accept").session(recruiter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("token", token))))
                .andExpect(status().isGone());
        mvc.perform(post("/api/v1/organizations/{id}/invitations", firstOrgId).session(recruiter).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body(Map.of("email", firstEmail, "role", "ADMIN"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void privateDocumentsAreOnlyReadableByTheirOwner() throws Exception {
        String firstEmail = "doc-owner-" + UUID.randomUUID() + "@example.test";
        String secondEmail = "doc-other-" + UUID.randomUUID() + "@example.test";
        register(firstEmail);
        register(secondEmail);
        MockHttpSession owner = login(firstEmail);
        MockHttpSession other = login(secondEmail);
        MockMultipartFile file = new MockMultipartFile("file", "resume.txt", "text/plain",
                "Private resume content".getBytes(StandardCharsets.UTF_8));
        MvcResult uploaded = mvc.perform(multipart("/api/v1/documents").file(file).session(owner).with(csrf()))
                .andExpect(status().isCreated()).andReturn();
        JsonNode document = json.readTree(uploaded.getResponse().getContentAsString());
        String documentId = document.path("id").asText();
        assertThat(document.path("filename").asText()).isEqualTo("resume.txt");

        mvc.perform(get("/api/v1/documents/{id}", documentId)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/documents/{id}", documentId).session(other)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/documents/{id}", documentId).session(owner))
                .andExpect(status().isOk());
    }

    private void register(String email) throws Exception {
        mvc.perform(post("/api/v1/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "displayName", "Test User", "password", PASSWORD))))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isUnauthorized());
        ArgumentCaptor<SimpleMailMessage> mailCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail, atLeastOnce()).send(mailCaptor.capture());
        String text = mailCaptor.getAllValues().stream()
                .filter(message -> email.equals(message.getTo()[0]))
                .map(SimpleMailMessage::getText)
                .filter(value -> value != null && value.contains("/?verify="))
                .findFirst().orElseThrow();
        String token = text.split("/\\?verify=")[1].split("\\s")[0];
        mvc.perform(post("/api/v1/auth/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", token)))).andExpect(status().isNoContent());
        mvc.perform(post("/api/v1/auth/verify-email").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("token", token)))).andExpect(status().isGone());
    }

    private MockHttpSession login(String email) throws Exception {
        MvcResult result = mvc.perform(post("/api/v1/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(body(Map.of("email", email, "password", PASSWORD))))
                .andExpect(status().isOk()).andReturn();
        return (MockHttpSession) result.getRequest().getSession(false);
    }

    private String body(Object value) throws Exception {
        return json.writeValueAsString(value);
    }
}
