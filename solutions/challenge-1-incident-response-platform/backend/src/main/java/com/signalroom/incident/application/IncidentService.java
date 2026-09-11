package com.signalroom.incident.application;

import com.signalroom.incident.api.IncidentDtos;
import com.signalroom.incident.domain.Incident;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class IncidentService {
    private final IncidentRepository repository;

    public IncidentService(IncidentRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<IncidentDtos.IncidentResponse> findAll() {
        return repository.findAll().stream().map(IncidentDtos.IncidentResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public IncidentDtos.IncidentResponse find(String id) {
        return IncidentDtos.IncidentResponse.from(get(id));
    }

    public IncidentDtos.IncidentResponse create(IncidentDtos.CreateIncidentRequest request) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Incident incident = new Incident("INC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(), request.title(), request.description(), request.severity(), request.owner(), request.impactedService(), now);
        return IncidentDtos.IncidentResponse.from(repository.save(incident));
    }

    public IncidentDtos.IncidentResponse update(String id, IncidentDtos.UpdateIncidentRequest request) {
        Incident incident = get(id);
        incident.update(request.owner(), request.severity(), request.impactedService(), OffsetDateTime.now(ZoneOffset.UTC));
        return IncidentDtos.IncidentResponse.from(incident);
    }

    public IncidentDtos.IncidentResponse transition(String id, IncidentDtos.TransitionRequest request) {
        Incident incident = get(id);
        incident.advance(request.status(), OffsetDateTime.now(ZoneOffset.UTC));
        return IncidentDtos.IncidentResponse.from(incident);
    }

    private Incident get(String id) {
        return repository.findById(id).orElseThrow(() -> new IncidentNotFoundException(id));
    }

    public static class IncidentNotFoundException extends RuntimeException {
        public IncidentNotFoundException(String id) { super("Incident not found: " + id); }
    }
}
