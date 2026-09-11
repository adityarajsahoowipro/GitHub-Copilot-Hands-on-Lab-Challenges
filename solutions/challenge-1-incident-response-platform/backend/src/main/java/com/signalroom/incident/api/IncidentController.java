package com.signalroom.incident.api;

import com.signalroom.incident.application.IncidentService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/incidents")
public class IncidentController {
    private final IncidentService service;

    public IncidentController(IncidentService service) {
        this.service = service;
    }

    @GetMapping
    public List<IncidentDtos.IncidentResponse> list() { return service.findAll(); }

    @GetMapping("/{id}")
    public IncidentDtos.IncidentResponse get(@PathVariable String id) { return service.find(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public IncidentDtos.IncidentResponse create(@Valid @RequestBody IncidentDtos.CreateIncidentRequest request) { return service.create(request); }

    @PatchMapping("/{id}")
    public IncidentDtos.IncidentResponse update(@PathVariable String id, @Valid @RequestBody IncidentDtos.UpdateIncidentRequest request) { return service.update(id, request); }

    @PostMapping("/{id}/transitions")
    public IncidentDtos.IncidentResponse transition(@PathVariable String id, @Valid @RequestBody IncidentDtos.TransitionRequest request) { return service.transition(id, request); }
}
