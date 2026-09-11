package com.incidentresponse.controller;

import com.incidentresponse.model.CreateIncidentRequest;
import com.incidentresponse.model.Incident;
import com.incidentresponse.model.UpdateIncidentRequest;
import com.incidentresponse.service.IncidentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents")
public class IncidentController {
    private final IncidentService incidentService;

    public IncidentController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public List<Incident> findAll() {
        return incidentService.findAll();
    }

    @GetMapping("/{incidentId}")
    public Incident findById(@PathVariable String incidentId) {
        return incidentService.findById(incidentId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Incident create(@Valid @RequestBody CreateIncidentRequest request) {
        return incidentService.create(request);
    }

    @PatchMapping("/{incidentId}")
    public Incident update(@PathVariable String incidentId, @Valid @RequestBody UpdateIncidentRequest request) {
        return incidentService.update(incidentId, request);
    }
}