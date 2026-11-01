package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.AiEvaluationResponse;
import com.example.ResumeSystemApplication.dto.JobFormDto;
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

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class AiScreeningService {

    private static final Logger log = LoggerFactory.getLogger(AiScreeningService.class);

    @Value("${ai.gemini.api-key:your-key-here}")
    private String geminiApiKey;

    @Value("${ai.gemini.model:gemini-1.5-flash}")
    private String geminiModel;

    @Value("${ai.gemini.url:https://generativelanguage.googleapis.com/v1beta/models}")
    private String geminiBaseUrl;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public AiScreeningService(RestTemplate restTemplate, ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
    }

    public AiEvaluationResponse evaluateResumeAgainstJob(String resumeText, String jobTitle, String jobDescription, String skillsRequired, Integer requiredExperience) {
        if (isGeminiConfigured()) {
            try {
                AiEvaluationResponse response = callGeminiEvaluation(resumeText, jobTitle, jobDescription, skillsRequired, requiredExperience);
                if (response != null) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini API call failed or timed out. Falling back to local high-precision evaluation engine: {}", e.getMessage());
            }
        }
        return evaluateLocally(resumeText, jobTitle, jobDescription, skillsRequired, requiredExperience);
    }

    public JobFormDto parseJobDescriptionFromText(String rawText) {
        if (isGeminiConfigured()) {
            try {
                JobFormDto response = callGeminiJobParsing(rawText);
                if (response != null) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini job parsing failed. Falling back to local heuristic parser: {}", e.getMessage());
            }
        }
        return parseJobLocally(rawText);
    }

    public String generateChatbotResponse(String prompt) {
        if (isGeminiConfigured()) {
            try {
                String response = callGeminiChatbot(prompt);
                if (response != null && !response.isBlank()) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini chatbot call failed. Falling back to internal copilot knowledge: {}", e.getMessage());
            }
        }
        return getFallbackChatbotReply(prompt);
    }

    private boolean isGeminiConfigured() {
        return geminiApiKey != null && !geminiApiKey.isBlank() && !geminiApiKey.equalsIgnoreCase("your-key-here");
    }

    // ---------------------------------------------------------------------------------------------------------
    // GEMINI CLOUD LLM CALLS
    // ---------------------------------------------------------------------------------------------------------

    private AiEvaluationResponse callGeminiEvaluation(String resumeText, String jobTitle, String jobDescription, String skillsRequired, Integer requiredExperience) throws Exception {
        String url = String.format("%s/%s:generateContent?key=%s", geminiBaseUrl, geminiModel, geminiApiKey);

        String systemPrompt = """
            You are an expert Principal Hiring Architect and Technical Recruiter.
            Evaluate the following candidate resume against the provided Job Description.
            
            Return ONLY a raw, valid JSON object strictly matching this schema (no markdown fences, no explanatory text):
            {
              "overallScore": <number 0-100>,
              "skillMatchScore": <number 0-100 (Hard Skill Alignment 35%)>,
              "experienceScore": <number 0-100 (Experience Depth & Seniority 25%)>,
              "impactScore": <number 0-100 (Project Impact & STAR Metric Quality 25%)>,
              "domainScore": <number 0-100 (Domain & Education Fit 15%)>,
              "matchedSkills": ["skill1", "skill2"],
              "missingSkills": ["skill1", "skill2"],
              "bonusSkills": ["skill1", "skill2"],
              "executiveSummary": "1-paragraph comprehensive hiring summary",
              "cheatDetected": <boolean>,
              "cheatFlags": ["explanation of any keyword stuffing, repetitive buzzwords, hidden white text, or inflated claims"],
              "interviewQuestions": [
                {
                  "question": "Question text",
                  "targetSkillOrClaim": "Targeted skill/achievement",
                  "rubricLevel1": "1 - Unsatisfactory",
                  "rubricLevel3": "3 - Competent",
                  "rubricLevel5": "5 - Exceptional"
                }
              ],
              "coachingReport": {
                "missingSkills": ["skill1"],
                "recommendedCertifications": ["cert1"],
                "recommendedProjects": ["project idea1"],
                "studyTopics": ["topic1"]
              },
              "extractedProfile": {
                "candidateName": "First Last",
                "email": "candidate@example.com",
                "phone": "+1234567890",
                "education": "Degree and University",
                "yearsExperience": <number>,
                "skills": ["extracted", "skills"]
              }
            }
            Ensure exactly 5 tailored technical interview questions with 1-5 rubrics are provided.
            """;

        String userPrompt = String.format("""
            JOB TITLE: %s
            JOB REQUIREMENTS:
            %s
            REQUIRED SKILLS: %s
            REQUIRED EXPERIENCE YEARS: %d
            
            CANDIDATE RESUME:
            %s
            """, jobTitle, jobDescription, skillsRequired != null ? skillsRequired : "", requiredExperience != null ? requiredExperience : 0, resumeText);

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(
                                Map.of("text", systemPrompt + "\n\n" + userPrompt)
                        ))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.2,
                        "responseMimeType", "application/json"
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                String jsonText = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                jsonText = cleanJsonResponse(jsonText);
                return objectMapper.readValue(jsonText, AiEvaluationResponse.class);
            }
        }
        return null;
    }

    private JobFormDto callGeminiJobParsing(String rawText) throws Exception {
        String url = String.format("%s/%s:generateContent?key=%s", geminiBaseUrl, geminiModel, geminiApiKey);
        String prompt = """
            Extract structured job details from the following raw job description.
            Return ONLY a valid JSON object matching:
            {
              "title": "string",
              "description": "string (cleaned and formatted)",
              "skillsRequired": "comma, separated, skills",
              "educationLevel": "string (e.g. Bachelor's in Computer Science)",
              "experienceRequired": <integer number of years>
            }
            
            RAW JOB TEXT:
            """ + rawText;

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", prompt)))
                ),
                "generationConfig", Map.of(
                        "temperature", 0.1,
                        "responseMimeType", "application/json"
                )
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            String jsonText = root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
            jsonText = cleanJsonResponse(jsonText);
            return objectMapper.readValue(jsonText, JobFormDto.class);
        }
        return null;
    }

    private String callGeminiChatbot(String query) throws Exception {
        String url = String.format("%s/%s:generateContent?key=%s", geminiBaseUrl, geminiModel, geminiApiKey);
        String systemInstruction = "You are the Recruiter AI Copilot inside a modern Applicant Tracking System. Provide concise, professional, insightful advice on talent sourcing, candidate screening, interview question design, and offer negotiations.";

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("role", "user", "parts", List.of(Map.of("text", systemInstruction + "\n\nRecruiter Query: " + query)))
                ),
                "generationConfig", Map.of("temperature", 0.7)
        );

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("candidates").get(0).path("content").path("parts").get(0).path("text").asText();
        }
        return null;
    }

    private String cleanJsonResponse(String raw) {
        String cleaned = raw.trim();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        return cleaned.trim();
    }

    // ---------------------------------------------------------------------------------------------------------
    // LOCAL HIGH-PRECISION HEURISTIC EVALUATION ENGINE (FALLBACK / OFFLINE)
    // ---------------------------------------------------------------------------------------------------------

    public AiEvaluationResponse evaluateLocally(String resumeText, String jobTitle, String jobDescription, String skillsRequired, Integer requiredExperience) {
        String lowerResume = resumeText.toLowerCase();

        // 1. Skill Extraction & Matching
        Set<String> requiredSkillSet = new LinkedHashSet<>();
        if (skillsRequired != null && !skillsRequired.isBlank()) {
            for (String s : skillsRequired.split("[,;\\n]")) {
                if (!s.trim().isBlank()) requiredSkillSet.add(s.trim());
            }
        }
        // Extract extra common skills from job description
        List<String> commonSkillsCatalog = List.of(
                "Java", "Spring Boot", "React", "JavaScript", "TypeScript", "Python", "Docker", "Kubernetes",
                "MySQL", "PostgreSQL", "MongoDB", "AWS", "Azure", "GCP", "Git", "REST API", "Microservices",
                "GraphQL", "CI/CD", "Redis", "Kafka", "HTML5", "CSS3", "Bootstrap", "Tailwind", "JUnit"
        );
        for (String skill : commonSkillsCatalog) {
            if (jobDescription != null && jobDescription.toLowerCase().contains(skill.toLowerCase())) {
                requiredSkillSet.add(skill);
            }
        }
        if (requiredSkillSet.isEmpty()) {
            requiredSkillSet.addAll(List.of("Communication", "Problem Solving", "Teamwork", "Software Development"));
        }

        List<String> matchedSkills = new ArrayList<>();
        List<String> missingSkills = new ArrayList<>();
        for (String reqSkill : requiredSkillSet) {
            if (lowerResume.contains(reqSkill.toLowerCase())) {
                matchedSkills.add(reqSkill);
            } else {
                missingSkills.add(reqSkill);
            }
        }

        List<String> bonusSkills = new ArrayList<>();
        for (String skill : commonSkillsCatalog) {
            if (!requiredSkillSet.contains(skill) && lowerResume.contains(skill.toLowerCase())) {
                bonusSkills.add(skill);
            }
        }

        // 2. Score Computation (Multi-Dimensional Explainable AI - XAI)
        // Hard Skill Alignment (35%)
        double skillRatio = requiredSkillSet.isEmpty() ? 1.0 : (double) matchedSkills.size() / requiredSkillSet.size();
        double skillMatchScore = Math.min(100.0, Math.round(skillRatio * 100.0 * 10.0) / 10.0);

        // Experience Depth & Seniority (25%)
        int detectedExp = extractExperienceYears(resumeText);
        int reqExp = requiredExperience != null && requiredExperience > 0 ? requiredExperience : 2;
        double expRatio = (double) detectedExp / reqExp;
        double experienceScore = Math.min(100.0, Math.round(Math.min(1.2, Math.max(0.4, expRatio)) * 80.0 * 10.0) / 10.0);

        // Project Impact & STAR Metric Quality (25%)
        // Detect numbers, percentages, STAR action verbs ("increased", "reduced", "delivered", "architected")
        int starSignals = 0;
        Pattern starPattern = Pattern.compile("(\\b\\d+%|\\$\\d+|reduced|improved|increased|optimized|architected|delivered|led|managed\\b)", Pattern.CASE_INSENSITIVE);
        Matcher starMatcher = starPattern.matcher(resumeText);
        while (starMatcher.find()) {
            starSignals++;
        }
        double impactScore = Math.min(100.0, Math.round(Math.min(10, starSignals) * 10.0));

        // Domain & Education Fit (15%)
        double domainScore = 75.0;
        if (lowerResume.contains("computer science") || lowerResume.contains("software engineering") || lowerResume.contains("b.tech") || lowerResume.contains("b.e.") || lowerResume.contains("master") || lowerResume.contains("bachelor")) {
            domainScore = 95.0;
        }

        // Overall Weighted Formula:
        // Hard Skill Alignment (35%) + Experience Depth (25%) + Impact Quality (25%) + Domain Fit (15%)
        double overallScore = Math.round((skillMatchScore * 0.35 + experienceScore * 0.25 + impactScore * 0.25 + domainScore * 0.15) * 10.0) / 10.0;
        overallScore = Math.min(99.0, Math.max(25.0, overallScore));

        // 3. AI Cheat & ATS Gaming Detector (Anti-Keyword Stuffing)
        boolean cheatDetected = false;
        List<String> cheatFlags = new ArrayList<>();
        // Check for repetitive word density
        Map<String, Integer> wordCounts = new HashMap<>();
        for (String w : lowerResume.split("\\W+")) {
            if (w.length() > 3) {
                wordCounts.put(w, wordCounts.getOrDefault(w, 0) + 1);
            }
        }
        for (Map.Entry<String, Integer> entry : wordCounts.entrySet()) {
            if (entry.getValue() > 18 && !List.of("with", "experience", "development", "project", "system").contains(entry.getKey())) {
                cheatDetected = true;
                cheatFlags.add("Excessive keyword density detected for token '" + entry.getKey() + "' (" + entry.getValue() + " occurrences)");
            }
        }
        if (lowerResume.contains("font-size:0") || lowerResume.contains("color:white") || lowerResume.contains("hidden text")) {
            cheatDetected = true;
            cheatFlags.add("Potential invisible ATS cheat injection text detected");
        }

        // 4. Tailored Interview Question & Rubric Generator (5 questions)
        List<AiEvaluationResponse.InterviewQuestionItem> questions = new ArrayList<>();
        List<String> focusSkills = !matchedSkills.isEmpty() ? matchedSkills : List.of("Software Architecture", "Problem Solving");
        int count = 0;
        for (String sk : focusSkills) {
            if (count >= 3) break;
            questions.add(AiEvaluationResponse.InterviewQuestionItem.builder()
                    .question("Can you describe a high-stakes production challenge where you leveraged " + sk + " to solve a bottleneck or system failure?")
                    .targetSkillOrClaim(sk)
                    .rubricLevel1("1: Superficial definition without concrete real-world context or architectural tradeoffs.")
                    .rubricLevel3("3: Demonstrates standard practical usage, mentions tools and basic error handling.")
                    .rubricLevel5("5: Deep architectural expertise; details profiling, failure isolation, and measurable latency/throughput gains.")
                    .build());
            count++;
        }
        // Fill remaining questions from missing skills or general engineering
        List<String> gapSkills = !missingSkills.isEmpty() ? missingSkills : List.of("Scalability", "System Resilience");
        for (String gap : gapSkills) {
            if (questions.size() >= 5) break;
            questions.add(AiEvaluationResponse.InterviewQuestionItem.builder()
                    .question("How would you quickly master and implement " + gap + " in our production tech stack within the first 30 days?")
                    .targetSkillOrClaim(gap)
                    .rubricLevel1("1: Unclear approach, relies purely on ad-hoc trial and error without structured learning.")
                    .rubricLevel3("3: Clear learning roadmap with documentation, sandboxing, and reference implementations.")
                    .rubricLevel5("5: Rapid prototyping, builds test harness, demonstrates proactive knowledge transfer to peers.")
                    .build());
        }

        // 5. Actionable Candidate Skill Gap Coaching Report
        AiEvaluationResponse.SkillGapCoachingReport coachingReport = AiEvaluationResponse.SkillGapCoachingReport.builder()
                .missingSkills(missingSkills)
                .recommendedCertifications(missingSkills.stream().map(s -> "Certified Professional in " + s).limit(3).collect(Collectors.toList()))
                .recommendedProjects(List.of(
                        "Build an end-to-end distributed system incorporating " + (!missingSkills.isEmpty() ? missingSkills.get(0) : "microservices"),
                        "Develop a CI/CD automated pipeline with containerized integration testing"
                ))
                .studyTopics(missingSkills.stream().map(s -> "Advanced " + s + " Design Patterns & Best Practices").limit(4).collect(Collectors.toList()))
                .build();

        // 6. Extracted Candidate Profile Info
        String candidateName = extractCandidateName(resumeText);
        String candidateEmail = extractCandidateEmail(resumeText);
        String candidatePhone = extractCandidatePhone(resumeText);
        String education = extractEducation(resumeText);

        AiEvaluationResponse.ExtractedProfile profile = AiEvaluationResponse.ExtractedProfile.builder()
                .candidateName(candidateName)
                .email(candidateEmail)
                .phone(candidatePhone)
                .education(education)
                .yearsExperience(detectedExp)
                .skills(matchedSkills)
                .build();

        String summary = String.format(
                "Candidate demonstrates %d%% alignment with %s requirements. Demonstrates solid competency in %s with %d detected years of relevant experience. %s",
                (int) overallScore,
                jobTitle,
                matchedSkills.isEmpty() ? "core foundations" : String.join(", ", matchedSkills.subList(0, Math.min(3, matchedSkills.size()))),
                detectedExp,
                missingSkills.isEmpty() ? "Candidate fulfills all essential skill requirements." : "Key growth opportunities include " + String.join(", ", missingSkills.subList(0, Math.min(2, missingSkills.size()))) + "."
        );

        return AiEvaluationResponse.builder()
                .overallScore(overallScore)
                .skillMatchScore(skillMatchScore)
                .experienceScore(experienceScore)
                .impactScore(impactScore)
                .domainScore(domainScore)
                .matchedSkills(matchedSkills)
                .missingSkills(missingSkills)
                .bonusSkills(bonusSkills)
                .executiveSummary(summary)
                .cheatDetected(cheatDetected)
                .cheatFlags(cheatFlags)
                .interviewQuestions(questions)
                .coachingReport(coachingReport)
                .extractedProfile(profile)
                .build();
    }

    private JobFormDto parseJobLocally(String rawText) {
        String title = "Software Engineer";
        String[] lines = rawText.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 3 && trimmed.length() < 70 && !trimmed.toLowerCase().contains("about us") && !trimmed.toLowerCase().contains("company")) {
                title = trimmed;
                break;
            }
        }

        int exp = extractExperienceYears(rawText);
        String edu = "Bachelor's Degree in Computer Science or related field";
        if (rawText.toLowerCase().contains("master")) {
            edu = "Master's Degree in Computer Science";
        }

        List<String> detectedSkills = new ArrayList<>();
        List<String> commonSkills = List.of("Java", "Spring Boot", "React", "TypeScript", "Python", "Docker", "Kubernetes", "AWS", "SQL", "Git", "REST API");
        for (String s : commonSkills) {
            if (rawText.toLowerCase().contains(s.toLowerCase())) {
                detectedSkills.add(s);
            }
        }

        return new JobFormDto(
                title,
                rawText.length() > 5000 ? rawText.substring(0, 5000) : rawText,
                String.join(", ", detectedSkills),
                edu,
                exp > 0 ? exp : 2
        );
    }

    private String getFallbackChatbotReply(String query) {
        String lower = query.toLowerCase();
        if (lower.contains("interview") || lower.contains("question")) {
            return "When structuring technical interviews, combine behavioral STAR inquiries with hands-on system architecture challenges. Review candidate claims in their resume and utilize the 1-5 rubric to systematically score hard skills, problem solving, and error-recovery capabilities.";
        } else if (lower.contains("reject") || lower.contains("feedback")) {
            return "Effective candidate feedback should be clear, respectful, and constructive. Highlight areas of strong fit first, followed by concrete skill gaps and actionable recommendations (e.g. recommended certifications or open-source projects) to foster a positive employer brand.";
        } else if (lower.contains("job") || lower.contains("description")) {
            return "To craft high-performing job descriptions, clearly distinguish between 'Must-Have Core Skills' (3-5 items) and 'Nice-to-Have Bonus Skills'. Specify expected business outcomes rather than generic task lists, and specify transparent experience ranges.";
        } else {
            return "Hello! I am your Recruiter AI Copilot. I can assist you with candidate pool summarization, screening criteria optimization, personalized interview rubrics, and automated communication drafting. How can I help with your current hiring pipeline?";
        }
    }

    // ---------------------------------------------------------------------------------------------------------
    // TEXT HEURISTIC EXTRACTORS
    // ---------------------------------------------------------------------------------------------------------

    private int extractExperienceYears(String text) {
        Pattern pattern = Pattern.compile("(\\b\\d+)\\+?\\s*(?:years?|yrs?)(?:\\s+of)?\\s+experience", Pattern.CASE_INSENSITIVE);
        Matcher matcher = pattern.matcher(text);
        if (matcher.find()) {
            try {
                return Integer.parseInt(matcher.group(1));
            } catch (Exception ignored) {}
        }
        // Count date ranges e.g. 2018 - 2023
        Pattern yearPattern = Pattern.compile("(?:20\\d{2}|19\\d{2})\\s*[-–to]+\\s*(?:20\\d{2}|Present|Current)", Pattern.CASE_INSENSITIVE);
        Matcher yearMatcher = yearPattern.matcher(text);
        int ranges = 0;
        while (yearMatcher.find()) {
            ranges++;
        }
        return Math.max(1, ranges * 2);
    }

    private String extractCandidateName(String text) {
        String[] lines = text.split("\\r?\\n");
        for (String line : lines) {
            String trimmed = line.trim();
            if (trimmed.length() > 2 && trimmed.length() < 35 && !trimmed.toLowerCase().contains("resume") && !trimmed.toLowerCase().contains("curriculum") && !trimmed.contains("@")) {
                return trimmed;
            }
        }
        return "Candidate";
    }

    private String extractCandidateEmail(String text) {
        Pattern emailPattern = Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,6}");
        Matcher matcher = emailPattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return "candidate@example.com";
    }

    private String extractCandidatePhone(String text) {
        Pattern phonePattern = Pattern.compile("(?:\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]?\\d{3}[-.\\s]?\\d{4}");
        Matcher matcher = phonePattern.matcher(text);
        if (matcher.find()) {
            return matcher.group();
        }
        return "N/A";
    }

    private String extractEducation(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("ph.d") || lower.contains("doctorate")) return "Ph.D.";
        if (lower.contains("master") || lower.contains("m.s.") || lower.contains("m.tech")) return "Master's Degree";
        if (lower.contains("bachelor") || lower.contains("b.s.") || lower.contains("b.tech") || lower.contains("b.e.")) return "Bachelor's Degree in Computer Science";
        return "Bachelor's Degree";
    }
}
