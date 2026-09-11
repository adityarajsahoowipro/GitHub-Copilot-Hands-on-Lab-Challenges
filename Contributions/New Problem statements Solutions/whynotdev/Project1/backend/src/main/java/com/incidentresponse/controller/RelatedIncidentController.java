package com.incidentresponse.controller;

import com.incidentresponse.model.RelatedIncidentSuggestion;
import com.incidentresponse.service.IncidentService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents/{incidentId}/related")
public class RelatedIncidentController {
    private final IncidentService incidentService;

    public RelatedIncidentController(IncidentService incidentService) { this.incidentService = incidentService; }

    @GetMapping
    public List<RelatedIncidentSuggestion> findRelated(@PathVariable String incidentId) { return incidentService.findRelated(incidentId); }

    @PostMapping("/{relatedIncidentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void link(@PathVariable String incidentId, @PathVariable String relatedIncidentId) { incidentService.linkRelated(incidentId, relatedIncidentId); }
}