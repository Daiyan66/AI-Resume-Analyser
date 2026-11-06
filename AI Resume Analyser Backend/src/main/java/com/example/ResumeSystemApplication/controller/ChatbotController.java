package com.example.ResumeSystemApplication.controller;

import com.example.ResumeSystemApplication.service.OpenRouterChatbotService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
public class ChatbotController {

    private final OpenRouterChatbotService chatbotService;

    public ChatbotController(OpenRouterChatbotService chatbotService) {
        this.chatbotService = chatbotService;
    }

    @PostMapping("/ask")
    public ResponseEntity<Map<String, Object>> askChatbot(@RequestBody Map<String, Object> request) {
        Object messagesObj = request.get("messages");
        String query = (String) request.get("query");

        Map<String, Object> result;
        if (messagesObj instanceof List) {
            @SuppressWarnings("unchecked")
            List<Map<String, String>> history = (List<Map<String, String>>) messagesObj;
            result = chatbotService.getChatbotResponse(history);
        } else if (query != null && !query.isBlank()) {
            result = chatbotService.getChatbotResponse(query);
        } else {
            return ResponseEntity.badRequest().body(Map.of("response", "Please provide a query or messages array."));
        }

        return ResponseEntity.ok(result);
    }
}
