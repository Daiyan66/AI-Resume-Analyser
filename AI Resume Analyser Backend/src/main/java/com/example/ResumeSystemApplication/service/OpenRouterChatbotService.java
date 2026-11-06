package com.example.ResumeSystemApplication.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class OpenRouterChatbotService {

    private static final Logger log = LoggerFactory.getLogger(OpenRouterChatbotService.class);

    @Value("${openrouter.api-key:}")
    private String openRouterApiKey;

    @Value("${openrouter.model:openai/gpt-4o-mini}")
    private String openRouterModel;

    @Value("${openrouter.url:https://openrouter.ai/api/v1/chat/completions}")
    private String openRouterUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String SYSTEM_PROMPT = """
        You are Gena, the official AI Assistant for the Next-Gen AI ATS & Resume Analyzer Platform.
        
        STRICT DOMAIN GUARDRAILS (MANDATORY):
        1. YOU MUST STRICTLY ANSWER ONLY QUERIES RELATED TO:
           - This Project & Platform: How multimodal resume screening works, 4-pillar scoring architecture (35% Hard Skills, 25% Experience Depth & Seniority, 25% STAR Impact & Metrics, 15% Domain & Education Fit), anti-cheat heuristics (detecting keyword stuffing, invisible white text, prompt injection), batch resume uploads, candidate skill gap reports, and the recruiter corporate onboarding protocol.
           - Recruiter Accounts & Onboarding: How to create a recruiter account, apply for corporate access via [Request Recruiter Access](/recruiter-request), 6-digit OTP verification, submitting corporate identification, and obtaining management audit approval to set a master password.
           - Candidate Career & Job Guidance: Browsing jobs, candidate account registration via [Candidate Registration](/register), understanding skill match percentages, skill gap coaching reports, resume formatting tips for ATS, technical interview preparation, and defensible 1-to-5 interview rubrics.
           - Re-application Cooldown Policy: If rejected for an opening, a 3-month skill enhancement window applies. After 3 months, candidates automatically receive an email invitation to re-apply with their updated resume!
        
        2. STRICT REFUSAL FOR OUT-OF-SCOPE TOPICS:
           - You MUST answer ANY legitimate question about accounts, registration, recruiters, candidates, jobs, resumes, applications, interviews, or platform features.
           - If and ONLY if the user asks about an external topic completely unrelated to this project or careers (e.g. sports, politics, weather, recipes, trivia, entertainment, celebrity gossip):
             YOU MUST REFUSE AND RESPOND EXACTLY:
             "I am Gena, strictly dedicated to assisting with this Next-Gen AI ATS platform, career openings, resume evaluations, and recruitment workflows.\\n\\nHow can I help you with your career or recruitment goals today?"
             And provide the frequent question suggestions.
        
        3. RESPONSE-RELEVANT FOLLOW-UP SUGGESTIONS (MANDATORY ON EVERY RESPONSE):
           - At the very end of EVERY response, on a new line, you MUST append:
             SUGGESTIONS: ["Question 1?", "Question 2?", "Question 3?"]
           - For regular answers, provide 2 to 4 concise, contextually relevant follow-up questions the user might want to explore next.
           - For out-of-scope refusals, your suggestions MUST be:
             SUGGESTIONS: ["How does the AI resume scoring work?", "What is the 3-month re-apply cooldown?", "How do recruiters get corporate access?", "How do I optimize my resume for ATS?"]
        
        4. ECOSYSTEM HYPERLINKS (MANDATORY WHEN REFERRING TO ACTIONS OR PAGES):
           - Whenever you mention a platform feature, page, action, or next step, provide a markdown hyperlink strictly within our internal ecosystem.
           - NEVER link to external domains or internet URLs. ONLY use internal ecosystem routes:
             * Candidate Job Openings: [Explore Job Openings](/candidate/jobs)
             * Candidate Application Tracker: [Track Application Status](/candidate/status)
             * Skill Gap Coaching & Roadmaps: [Skill Gap Analysis](/candidate/skill-gap)
             * Recruiter Account & Access Request: [Request Recruiter Access](/recruiter-request)
             * Recruiter Token Onboarding: [Complete Onboarding](/recruiter/onboard)
             * Recruiter Post New Job: [Post a Job](/recruiter/upload-job)
             * Recruiter Bulk Resume Screening: [Upload & Screen Resumes](/recruiter/upload-resumes)
             * Recruiter Candidate Database: [Candidate Directory](/recruiter/candidates)
             * Notifications Center: [Notifications](/notifications)
             * Account Password Reset: [Reset Password](/forgot-password)
             * Workspace Home / Sign In: [Workspace Sign In](/) or [Workspace Dashboard](/dashboard)
        
        TONE & STYLE:
        - Name yourself Gena.
        - Warm, professional, helpful, and concise.
        - Use clean markdown bullet points, bold highlights, and readable structure.
        - Never write any additional text after the SUGGESTIONS line.
        """;

    public OpenRouterChatbotService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public String getChatbotReply(String singleQuery) {
        Map<String, Object> res = getChatbotResponse(singleQuery);
        return (String) res.get("response");
    }

    public String getChatbotReply(List<Map<String, String>> conversationHistory) {
        Map<String, Object> res = getChatbotResponse(conversationHistory);
        return (String) res.get("response");
    }

    public Map<String, Object> getChatbotResponse(String singleQuery) {
        List<Map<String, String>> history = new ArrayList<>();
        history.add(Map.of("role", "user", "content", singleQuery));
        return getChatbotResponse(history);
    }

    public Map<String, Object> getChatbotResponse(List<Map<String, String>> conversationHistory) {
        if (openRouterApiKey == null || openRouterApiKey.isBlank()) {
            return getFallbackResponseMap(conversationHistory);
        }

        try {
            List<Map<String, String>> messages = new ArrayList<>();
            messages.add(Map.of("role", "system", "content", SYSTEM_PROMPT));

            if (conversationHistory != null) {
                int start = Math.max(0, conversationHistory.size() - 10);
                for (int i = start; i < conversationHistory.size(); i++) {
                    Map<String, String> msg = conversationHistory.get(i);
                    String role = msg.getOrDefault("role", "user");
                    String content = msg.getOrDefault("content", "");
                    if (!content.isBlank()) {
                        messages.add(Map.of("role", role, "content", content));
                    }
                }
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", openRouterModel != null && !openRouterModel.isBlank() ? openRouterModel : "openai/gpt-4o-mini");
            requestBody.put("messages", messages);
            requestBody.put("temperature", 0.3);
            requestBody.put("max_tokens", 850);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("Authorization", "Bearer " + openRouterApiKey.trim());
            headers.set("HTTP-Referer", "http://localhost:5173");
            headers.set("X-Title", "Gena AI ATS Assistant");

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            ResponseEntity<String> response = restTemplate.postForEntity(openRouterUrl, entity, String.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode choices = root.path("choices");
                if (choices.isArray() && choices.size() > 0) {
                    String rawReply = choices.get(0).path("message").path("content").asText();
                    if (rawReply != null && !rawReply.isBlank()) {
                        return parseSuggestionsFromReply(rawReply.trim());
                    }
                }
            }
        } catch (Exception ex) {
            log.error("OpenRouter API call failed: {}", ex.getMessage(), ex);
        }

        return getFallbackResponseMap(conversationHistory);
    }

    private Map<String, Object> parseSuggestionsFromReply(String rawReply) {
        String suggestionsMarker = "SUGGESTIONS:";
        List<String> suggestedQuestions = new ArrayList<>();
        String cleanText = rawReply;

        if (rawReply.contains(suggestionsMarker)) {
            int markerIndex = rawReply.indexOf(suggestionsMarker);
            cleanText = rawReply.substring(0, markerIndex).trim();
            String jsonPart = rawReply.substring(markerIndex + suggestionsMarker.length()).trim();

            try {
                JsonNode arr = objectMapper.readTree(jsonPart);
                if (arr.isArray()) {
                    for (JsonNode n : arr) {
                        if (n.isTextual() && !n.asText().isBlank()) {
                            suggestedQuestions.add(n.asText().trim());
                        }
                    }
                }
            } catch (Exception ignored) {
                // Fallback splitting if model returned comma-separated list
                String[] parts = jsonPart.replaceAll("[\\[\\]\"]", "").split(",");
                for (String p : parts) {
                    if (!p.trim().isBlank()) {
                        suggestedQuestions.add(p.trim());
                    }
                }
            }
        }

        if (suggestedQuestions.isEmpty()) {
            suggestedQuestions = getDefaultSuggestionsForText(cleanText);
        }

        Map<String, Object> result = new HashMap<>();
        result.put("response", cleanText);
        result.put("suggestedQuestions", suggestedQuestions);
        return result;
    }

    private List<String> getDefaultSuggestionsForText(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("cooldown") || lower.contains("reject") || lower.contains("3-month")) {
            return List.of(
                "How do I re-apply after the cooldown?",
                "What skills should I improve during cooldown?",
                "Where can I view my application status?"
            );
        }
        if (lower.contains("score") || lower.contains("match") || lower.contains("pillar") || lower.contains("star")) {
            return List.of(
                "How is the STAR project impact calculated?",
                "What anti-cheat checks are performed?",
                "How do I boost my hard skills score?"
            );
        }
        if (lower.contains("recruiter") || lower.contains("corporate") || lower.contains("onboard") || lower.contains("verification")) {
            return List.of(
                "What document proof is required for recruiters?",
                "How does the corporate OTP verification work?",
                "How long does admin approval take?"
            );
        }
        return List.of(
            "How does the AI resume scoring work?",
            "What is the 3-month re-apply cooldown?",
            "How do recruiters get corporate access?",
            "How do I optimize my resume for ATS?"
        );
    }

    private Map<String, Object> getFallbackResponseMap(List<Map<String, String>> conversationHistory) {
        String lastQuery = "";
        if (conversationHistory != null && !conversationHistory.isEmpty()) {
            lastQuery = conversationHistory.get(conversationHistory.size() - 1).getOrDefault("content", "").toLowerCase();
        }

        String reply;
        List<String> suggestions;

        if (lastQuery.contains("score") || lastQuery.contains("match") || lastQuery.contains("evaluat")) {
            reply = "### 🎯 AI Evaluation & 4-Pillar Scoring Architecture\n\nOur multimodal ATS screens resumes using a defensible **4-pillar evaluation framework**:\n- **Hard Skill Alignment (35%):** Exact & semantic matching against technical requirements.\n- **Experience Depth & Seniority (25%):** Tenure, domain relevance, and leadership scope.\n- **STAR Project Impact (25%):** Situation, Task, Action, and quantifiable Results metrics.\n- **Domain & Education (15%):** Degree relevance and accredited certifications.\n- **Anti-Cheat Heuristics:** Scans for white-font text stuffing, keyword spamming, and prompt injection.";
            suggestions = List.of(
                "How is STAR impact measured?",
                "What anti-cheat checks are run?",
                "How to improve hard skills match?"
            );
        } else if (lastQuery.contains("cooldown") || lastQuery.contains("reject") || lastQuery.contains("re-apply") || lastQuery.contains("reapply")) {
            reply = "### ⏳ 3-Month Re-Application Cooldown Policy\n\n- If your application is not selected for a position, a **3-month skill enhancement cooldown** is applied.\n- This provides focused time to master identified skill gaps.\n- **Automated Re-Invitation:** Once the 3-month window elapses, our system automatically emails you an invitation to submit your updated resume with no manual tracking needed!";
            suggestions = List.of(
                "How do I re-apply after the cooldown?",
                "What skills should I improve during cooldown?",
                "Where can I view my application status?"
            );
        } else if (lastQuery.contains("recruiter") || lastQuery.contains("corporate") || lastQuery.contains("register")) {
            reply = "### 🏢 Enterprise Recruiter Verification\n\n1. Recruiters submit a corporate request on the [Request Recruiter Access](/recruiter-request) page.\n2. Management sends an invitation token and 6-digit OTP to their corporate email.\n3. Recruiter verifies OTP and uploads official corporate credentials (Company ID or authorization).\n4. Admin audits the credentials and approves the request, emailing a secure link to set their master password.";
            suggestions = List.of(
                "What document proof is required for recruiters?",
                "How does the corporate OTP verification work?",
                "How long does admin approval take?"
            );
        } else {
            reply = "I am Gena, strictly dedicated to assisting with this Next-Gen AI ATS platform, career openings, resume evaluations, and recruitment workflows.\n\nHow can I help you with your career or recruitment goals today?";
            suggestions = List.of(
                "How does the AI resume scoring work?",
                "What is the 3-month re-apply cooldown?",
                "How do recruiters get corporate access?",
                "How do I optimize my resume for ATS?"
            );
        }

        Map<String, Object> map = new HashMap<>();
        map.put("response", reply);
        map.put("suggestedQuestions", suggestions);
        return map;
    }
}
