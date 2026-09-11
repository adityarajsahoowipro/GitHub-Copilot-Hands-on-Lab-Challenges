package com.signalroom.assistant.api;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public final class AssistantDtos {
    private AssistantDtos() { }

    public record MessageRequest(
        @NotBlank String incidentId,
        @NotBlank String question,
        String conversationId
    ) { }

    public record Citation(String source, String type, String label) { }

    public record MessageResponse(
        String answer,
        List<Citation> citations,
        boolean grounded
    ) { }
}
