package com.incidentresponse.service;

import com.incidentresponse.model.CreateIncidentRequest;
import com.incidentresponse.model.Incident;
import com.incidentresponse.model.IncidentHistoryEntry;
import com.incidentresponse.model.RelatedIncidentSuggestion;
import com.incidentresponse.model.RootCauseAnalysis;
import com.incidentresponse.model.RootCauseAction;
import com.incidentresponse.model.CreateRootCauseActionRequest;
import com.incidentresponse.model.UpdateRootCauseActionRequest;
import com.incidentresponse.model.UpdateIncidentRequest;
import com.incidentresponse.model.UpdateRootCauseAnalysisRequest;
import com.incidentresponse.repository.IncidentRepository;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Service;

@Service
public class IncidentService {
    private final IncidentRepository incidentRepository;
    private final AtomicLong nextIncidentNumber = new AtomicLong(1000);
    private final Map<String, List<IncidentHistoryEntry>> historyByIncident = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, RootCauseAnalysis> rcasByIncident = new java.util.concurrent.ConcurrentHashMap<>();
    private final Map<String, List<RootCauseAction>> actionsByIncident = new java.util.concurrent.ConcurrentHashMap<>();
    private final java.util.Set<String> relatedPairs = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public IncidentService(IncidentRepository incidentRepository) {
        this.incidentRepository = incidentRepository;
    }

    public List<Incident> findAll() {
        return incidentRepository.findAll();
    }

    public Incident create(CreateIncidentRequest request) {
        var duplicate = incidentRepository.existsByImpactedServiceIgnoreCase(request.impactedService().trim());
        if (duplicate) throw new IllegalArgumentException("An incident has already been raised for " + request.impactedService().trim() + ".");
        var timestamp = java.time.Instant.now();
        var incident = new Incident(
                "INC-" + nextIncidentNumber.incrementAndGet(),
                request.title(),
                request.description(),
                request.severity(),
                "OPEN",
                request.owner(),
                request.impactedService(),
                timestamp,
                timestamp);
        incidentRepository.save(incident);
        historyByIncident.put(incident.incidentId(), new CopyOnWriteArrayList<>(List.of(new IncidentHistoryEntry("CREATED", "Incident created", timestamp))));
        return incident;
    }

    public Incident findById(String incidentId) {
        return incidentRepository.findById(incidentId)
                .orElseThrow(() -> new NoSuchElementException("Incident not found: " + incidentId));
    }

    public Incident update(String incidentId, UpdateIncidentRequest request) {
        var incident = findById(incidentId);
        var status = request.status() == null ? incident.status() : request.status();
        if (!isValidTransition(incident.status(), status)) throw new IllegalArgumentException("Cannot change from " + incident.status() + " to " + status + ". Follow OPEN -> IN_PROGRESS -> MITIGATED -> CLOSED. An incident cannot be closed without being in progress.");
        if (request.impactedService() != null && request.impactedService().isBlank()) throw new IllegalArgumentException("Impacted service cannot be empty");
        var updated = new Incident(incident.incidentId(), incident.title(), incident.description(), request.severity() == null ? incident.severity() : request.severity(), status,
                request.owner() == null ? incident.owner() : request.owner(), request.impactedService() == null ? incident.impactedService() : request.impactedService(), incident.createdAt(), java.time.Instant.now());
        incidentRepository.save(updated);
        if (!incident.status().equals(status)) historyByIncident.get(incidentId).add(new IncidentHistoryEntry("STATUS_CHANGED", "Status changed from " + incident.status() + " to " + status, updated.updatedAt()));
        if (!incident.owner().equals(updated.owner())) historyByIncident.get(incidentId).add(new IncidentHistoryEntry("OWNER_CHANGED", "Owner changed to " + updated.owner(), updated.updatedAt()));
        if (!incident.severity().equals(updated.severity())) historyByIncident.get(incidentId).add(new IncidentHistoryEntry("SEVERITY_CHANGED", "Severity changed from " + incident.severity() + " to " + updated.severity(), updated.updatedAt()));
        if (incident.status().equals(status) && incident.owner().equals(updated.owner()) && incident.severity().equals(updated.severity())) historyByIncident.get(incidentId).add(new IncidentHistoryEntry("UPDATED", "Incident details updated", updated.updatedAt()));
        return updated;
    }

    public List<IncidentHistoryEntry> findHistory(String incidentId) { findById(incidentId); return List.copyOf(historyByIncident.get(incidentId)); }

    public RootCauseAnalysis generateRca(String incidentId) {
        var incident = findById(incidentId);
        var existing = rcasByIncident.get(incidentId);
        if (existing != null) return existing;
        var timestamp = java.time.Instant.now();
        var rca = new RootCauseAnalysis(incidentId, incident.title() + ". " + incident.description(), "Investigation required.", incident.impactedService(), "Document recovery steps.", "Document lessons learned.", "Add preventive actions.", timestamp, timestamp);
        rcasByIncident.put(incidentId, rca);
        historyByIncident.get(incidentId).add(new IncidentHistoryEntry("RCA_CREATED", "Root cause analysis template created", timestamp));
        return rca;
    }

    public RootCauseAnalysis findRca(String incidentId) {
        findById(incidentId);
        var rca = rcasByIncident.get(incidentId);
        if (rca == null) throw new NoSuchElementException("No RCA exists for incident: " + incidentId);
        return rca;
    }

    public List<RootCauseAnalysis> findAllRcas() {
        return rcasByIncident.values().stream()
                .sorted(java.util.Comparator.comparing(RootCauseAnalysis::updatedAt).reversed())
                .toList();
    }

    public RootCauseAnalysis updateRca(String incidentId, UpdateRootCauseAnalysisRequest request) {
        var existing = findRca(incidentId);
        var updated = new RootCauseAnalysis(incidentId, request.incidentSummary(), request.rootCause(), request.impactedServices(), request.resolution(), request.lessonsLearned(), request.recommendations(), existing.generatedAt(), java.time.Instant.now());
        rcasByIncident.put(incidentId, updated);
        historyByIncident.get(incidentId).add(new IncidentHistoryEntry("RCA_UPDATED", "Root cause analysis updated", updated.updatedAt()));
        return updated;
    }

    public List<RootCauseAction> findRcaActions(String incidentId) {
        findRca(incidentId);
        return List.copyOf(actionsByIncident.getOrDefault(incidentId, List.of()));
    }

    public RootCauseAction createRcaAction(String incidentId, CreateRootCauseActionRequest request) {
        findRca(incidentId);
        var timestamp = java.time.Instant.now();
        var action = new RootCauseAction("ACT-" + java.util.UUID.randomUUID().toString().substring(0, 8).toUpperCase(), incidentId, request.description(), request.owner(), request.dueDate(), request.status() == null ? "OPEN" : request.status(), timestamp, timestamp);
        actionsByIncident.computeIfAbsent(incidentId, ignored -> new CopyOnWriteArrayList<>()).add(action);
        historyByIncident.get(incidentId).add(new IncidentHistoryEntry("RCA_ACTION_CREATED", "RCA action assigned to " + action.owner(), timestamp));
        return action;
    }

    public RootCauseAction updateRcaAction(String incidentId, String actionId, UpdateRootCauseActionRequest request) {
        var actions = actionsByIncident.getOrDefault(incidentId, List.of());
        var existing = actions.stream().filter(action -> action.actionId().equals(actionId)).findFirst()
                .orElseThrow(() -> new NoSuchElementException("RCA action not found: " + actionId));
        var updated = new RootCauseAction(existing.actionId(), existing.incidentId(), existing.description(), existing.owner(), existing.dueDate(), request.status(), existing.createdAt(), java.time.Instant.now());
        actions.set(actions.indexOf(existing), updated);
        historyByIncident.get(incidentId).add(new IncidentHistoryEntry("RCA_ACTION_UPDATED", "RCA action marked " + request.status().toLowerCase(), updated.updatedAt()));
        return updated;
    }

    public List<RelatedIncidentSuggestion> findRelated(String incidentId) {
        var selected = findById(incidentId);
        return incidentRepository.findAll().stream().filter(candidate -> !candidate.incidentId().equals(incidentId)).map(candidate -> {
            var reasons = new java.util.ArrayList<String>();
            if (selected.impactedService().equalsIgnoreCase(candidate.impactedService())) reasons.add("Both incidents affect " + selected.impactedService());
            if (java.time.Duration.between(selected.createdAt(), candidate.createdAt()).abs().compareTo(java.time.Duration.ofMinutes(30)) <= 0) reasons.add("Created within 30 minutes of each other");
            return new RelatedIncidentSuggestion(candidate, reasons, relatedPairs.contains(pairKey(incidentId, candidate.incidentId())));
        }).filter(suggestion -> !suggestion.reasons().isEmpty()).toList();
    }

    public void linkRelated(String incidentId, String relatedIncidentId) {
        findById(incidentId); findById(relatedIncidentId);
        if (incidentId.equals(relatedIncidentId)) throw new IllegalArgumentException("An incident cannot be linked to itself");
        if (!relatedPairs.add(pairKey(incidentId, relatedIncidentId))) throw new IllegalArgumentException("These incidents are already linked");
    }

    private String pairKey(String first, String second) { return first.compareTo(second) < 0 ? first + ":" + second : second + ":" + first; }

    private boolean isValidTransition(String current, String next) { return current.equals(next) || current.equals("OPEN") && next.equals("IN_PROGRESS") || current.equals("IN_PROGRESS") && next.equals("MITIGATED") || current.equals("MITIGATED") && next.equals("CLOSED") || current.equals("CLOSED") && next.equals("IN_PROGRESS"); }
}
