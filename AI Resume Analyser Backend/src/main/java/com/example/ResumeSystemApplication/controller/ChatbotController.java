package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.service.AiScreeningService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final AiScreeningService aiScreeningService;

    public ChatbotController(AiScreeningService aiScreeningService) {
        this.aiScreeningService = aiScreeningService;
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, String>> askChatbot(@RequestBody Map<String, String> request) {
        String query = request.get("query");
        if (query == null || query.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("response", "Query cannot be empty."));
        }

        String answer = aiScreeningService.generateChatbotResponse(query);
        return ResponseEntity.ok(Map.of("response", answer));
    }
}
