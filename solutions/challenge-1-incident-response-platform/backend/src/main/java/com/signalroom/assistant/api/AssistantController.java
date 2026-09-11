package com.signalroom.assistant.api;

import com.signalroom.assistant.application.IncidentAssistantService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/assistant", produces = MediaType.APPLICATION_JSON_VALUE)
public class AssistantController {
    private final IncidentAssistantService service;

    public AssistantController(IncidentAssistantService service) {
        this.service = service;
    }

    @PostMapping("/messages")
    public AssistantDtos.MessageResponse message(@Valid @RequestBody AssistantDtos.MessageRequest request) {
        return service.answer(request);
    }
}
