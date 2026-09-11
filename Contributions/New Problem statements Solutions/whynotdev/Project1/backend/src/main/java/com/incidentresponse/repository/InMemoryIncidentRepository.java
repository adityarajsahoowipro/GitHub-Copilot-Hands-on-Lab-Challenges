package com.incidentresponse.repository;

import com.incidentresponse.model.Incident;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.stereotype.Repository;

@Repository
public class InMemoryIncidentRepository implements IncidentRepository {
    private final List<Incident> incidents = new CopyOnWriteArrayList<>();

    @Override
    public List<Incident> findAll() {
        return List.copyOf(incidents);
    }

    @Override
    public Optional<Incident> findById(String incidentId) {
        return incidents.stream().filter(incident -> incident.incidentId().equals(incidentId)).findFirst();
    }

    @Override
    public boolean existsByImpactedServiceIgnoreCase(String impactedService) {
        return incidents.stream().anyMatch(incident -> incident.impactedService().equalsIgnoreCase(impactedService));
    }

    
    @Override
    public Incident save(Incident incident) {
        incidents.removeIf(current -> current.incidentId().equals(incident.incidentId()));
        incidents.add(incident);
        return incident;
    }
}
