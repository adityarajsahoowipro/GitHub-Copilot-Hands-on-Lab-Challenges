package com.signalroom.assistant.infrastructure;

import com.signalroom.assistant.application.LlmClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

@Component
public class OpenAiCompatibleLlmClient implements LlmClient {
    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public OpenAiCompatibleLlmClient(
        RestClient.Builder restClientBuilder,
        @Value("${llm.base-url:https://api.openai.com/v1}") String baseUrl,
        @Value("${llm.api-key:}") String apiKey,
        @Value("${llm.model:}") String model
    ) {
        this.restClient = restClientBuilder.baseUrl(baseUrl).build();
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    @SuppressWarnings("unchecked")
    public String answer(String systemPrompt, String userPrompt) {
        if (apiKey.isBlank() || model.isBlank()) {
            throw new AssistantNotConfiguredException("LLM_API_KEY and LLM_MODEL must be configured on the backend");
        }
        Map<String, Object> payload = Map.of(
            "model", model,
            "temperature", 0.1,
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            )
        );
        Map<String, Object> response = restClient.post()
            .uri("/chat/completions")
            .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
            .body(payload)
            .retrieve()
            .body(Map.class);
        if (response == null || !(response.get("choices") instanceof List<?> choices) || choices.isEmpty()) {
            throw new IllegalStateException("LLM returned no answer choices");
        }
        Object firstChoice = choices.getFirst();
        if (!(firstChoice instanceof Map<?, ?> choice) || !(choice.get("message") instanceof Map<?, ?> message) || !(message.get("content") instanceof String content) || content.isBlank()) {
            throw new IllegalStateException("LLM response did not contain message content");
        }
        return content.trim();
    }

    public static class AssistantNotConfiguredException extends RuntimeException {
        public AssistantNotConfiguredException(String message) { super(message); }
    }
}
