package com.signalroom.incident.application;

import com.signalroom.incident.domain.Incident;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IncidentRepository extends JpaRepository<Incident, String> {
}
