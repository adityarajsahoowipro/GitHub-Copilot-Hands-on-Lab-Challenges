package com.incidentresponse.controller;

import com.incidentresponse.model.RootCauseAnalysis;
import com.incidentresponse.service.IncidentService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/root-cause-analyses")
public class RootCauseAnalysisRegisterController {
    private final IncidentService incidentService;

    public RootCauseAnalysisRegisterController(IncidentService incidentService) {
        this.incidentService = incidentService;
    }

    @GetMapping
    public List<RootCauseAnalysis> findAll() {
        return incidentService.findAllRcas();
    }
}