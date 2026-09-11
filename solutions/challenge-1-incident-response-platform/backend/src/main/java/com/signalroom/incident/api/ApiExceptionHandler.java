package com.signalroom.incident.api;

import com.signalroom.incident.application.IncidentService;
import com.signalroom.assistant.infrastructure.OpenAiCompatibleLlmClient;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IncidentService.IncidentNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, Object> notFound(IncidentService.IncidentNotFoundException exception) {
        return problem("incident-not-found", exception.getMessage(), HttpStatus.NOT_FOUND.value());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.CONFLICT)
    public Map<String, Object> conflict(IllegalStateException exception) {
        return problem("invalid-incident-operation", exception.getMessage(), HttpStatus.CONFLICT.value());
    }

    @ExceptionHandler(OpenAiCompatibleLlmClient.AssistantNotConfiguredException.class)
    @ResponseStatus(HttpStatus.SERVICE_UNAVAILABLE)
    public Map<String, Object> assistantUnavailable(OpenAiCompatibleLlmClient.AssistantNotConfiguredException exception) {
        return problem("assistant-not-configured", exception.getMessage(), HttpStatus.SERVICE_UNAVAILABLE.value());
    }

    private Map<String, Object> problem(String type, String detail, int status) {
        return Map.of("type", type, "title", "Incident operation rejected", "status", status, "detail", detail, "timestamp", OffsetDateTime.now());
    }
}
