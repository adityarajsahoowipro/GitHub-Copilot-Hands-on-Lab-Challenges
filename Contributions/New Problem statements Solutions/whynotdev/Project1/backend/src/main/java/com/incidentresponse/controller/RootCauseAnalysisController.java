package com.incidentresponse.controller;

import com.incidentresponse.model.IncidentHistoryEntry;
import com.incidentresponse.model.RootCauseAnalysis;
import com.incidentresponse.model.RootCauseAction;
import com.incidentresponse.model.CreateRootCauseActionRequest;
import com.incidentresponse.model.UpdateRootCauseActionRequest;
import com.incidentresponse.model.UpdateRootCauseAnalysisRequest;
import com.incidentresponse.service.IncidentService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/incidents/{incidentId}")
public class RootCauseAnalysisController {
    private final IncidentService incidentService;

    public RootCauseAnalysisController(IncidentService incidentService) { this.incidentService = incidentService; }

    @GetMapping("/history")
    public List<IncidentHistoryEntry> findHistory(@PathVariable String incidentId) { return incidentService.findHistory(incidentId); }

    @PostMapping("/rca")
    public RootCauseAnalysis generate(@PathVariable String incidentId) { return incidentService.generateRca(incidentId); }

    @GetMapping("/rca")
    public RootCauseAnalysis find(@PathVariable String incidentId) { return incidentService.findRca(incidentId); }

    @PutMapping("/rca")
    public RootCauseAnalysis update(@PathVariable String incidentId, @Valid @RequestBody UpdateRootCauseAnalysisRequest request) { return incidentService.updateRca(incidentId, request); }

    @GetMapping("/rca/actions")
    public List<RootCauseAction> findActions(@PathVariable String incidentId) { return incidentService.findRcaActions(incidentId); }

    @PostMapping("/rca/actions")
    public RootCauseAction createAction(@PathVariable String incidentId, @Valid @RequestBody CreateRootCauseActionRequest request) { return incidentService.createRcaAction(incidentId, request); }

    @PutMapping("/rca/actions/{actionId}")
    public RootCauseAction updateAction(@PathVariable String incidentId, @PathVariable String actionId, @Valid @RequestBody UpdateRootCauseActionRequest request) { return incidentService.updateRcaAction(incidentId, actionId, request); }
}