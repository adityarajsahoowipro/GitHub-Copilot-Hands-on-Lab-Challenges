package com.incidentresponse.repository;

import com.incidentresponse.model.Incident;
import java.util.List;
import java.util.Optional;

public interface IncidentRepository {
    List<Incident> findAll();

    Optional<Incident> findById(String incidentId);

    boolean existsByImpactedServiceIgnoreCase(String impactedService);

    Incident save(Incident incident);
}
