package com.airesume.ats.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AiTextClient {
    private final ObjectMapper json;
    private final String key;
    private final String model;
    private final String endpoint;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();

    public AiTextClient(ObjectMapper json, @Value("${app.ai.api-key:}") String key,
                        @Value("${app.ai.model:}") String model,
                        @Value("${app.ai.endpoint:https://openrouter.ai/api/v1/chat/completions}") String endpoint) {
        this.json = json;
        this.key = key;
        this.model = model;
        this.endpoint = endpoint;
    }

    public String model() { return model; }

    public String complete(String instructions, Object data, int maxTokens) {
        if (key.isBlank() || model.isBlank()) throw unavailable();
        try {
            String body = json.writeValueAsString(Map.of("model", model, "temperature", 0.2, "max_tokens", maxTokens,
                    "messages", List.of(Map.of("role", "system", "content", instructions),
                            Map.of("role", "user", "content", json.writeValueAsString(data)))));
            var request = HttpRequest.newBuilder(URI.create(endpoint)).timeout(Duration.ofSeconds(25))
                    .header("Authorization", "Bearer " + key).header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(body)).build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw unusable();
            var result = json.readTree(response.body());
            if (result == null) throw unusable();
            String text = result.path("choices").path(0).path("message").path("content").asText("").strip();
            if (text.isBlank() || text.length() > 12000) throw unusable();
            return text;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw unavailable();
        } catch (IOException | IllegalArgumentException e) {
            throw unavailable();
        }
    }

    private static ResponseStatusException unavailable() {
        return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "AI assistance is unavailable. Check the provider settings or continue manually.");
    }

    public static ResponseStatusException unusable() {
        return new ResponseStatusException(HttpStatus.BAD_GATEWAY, "The AI provider did not return a usable result. Continue manually or try again.");
    }
}
