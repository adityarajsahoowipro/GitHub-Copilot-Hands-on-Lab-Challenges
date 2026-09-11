package com.signalroom.incident.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.OffsetDateTime;

import static com.signalroom.incident.domain.IncidentEnums.Severity;
import static com.signalroom.incident.domain.IncidentEnums.Status;

@Entity
@Table(name = "incidents")
public class Incident {
    @Id
    @Column(name = "incident_id", length = 32)
    private String incidentId;
    @Column(nullable = false, length = 200)
    private String title;
    @Column(nullable = false, columnDefinition = "text")
    private String description;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 2)
    private Severity severity;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;
    @Column(nullable = false, length = 120)
    private String owner;
    @Column(name = "impacted_service", nullable = false, length = 120)
    private String impactedService;
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
    @Column(name = "closed_at")
    private OffsetDateTime closedAt;
    @Version
    private long version;

    protected Incident() { }

    public Incident(String incidentId, String title, String description, Severity severity, String owner, String impactedService, OffsetDateTime createdAt) {
        this.incidentId = incidentId;
        this.title = title;
        this.description = description;
        this.severity = severity;
        this.status = Status.OPEN;
        this.owner = owner;
        this.impactedService = impactedService;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public String getIncidentId() { return incidentId; }
    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public Severity getSeverity() { return severity; }
    public Status getStatus() { return status; }
    public String getOwner() { return owner; }
    public String getImpactedService() { return impactedService; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public OffsetDateTime getUpdatedAt() { return updatedAt; }
    public OffsetDateTime getClosedAt() { return closedAt; }

    public void update(String owner, Severity severity, String impactedService, OffsetDateTime now) {
        this.owner = owner;
        this.severity = severity;
        this.impactedService = impactedService;
        this.updatedAt = now;
    }

    public void advance(Status next, OffsetDateTime now) {
        if (status == Status.CLOSED) {
            if (closedAt == null || now.isAfter(closedAt.plusHours(24))) {
                throw new IllegalStateException("Incident can no longer be reopened after 24 hours");
            }
            if (next != Status.INVESTIGATING) {
                throw new IllegalStateException("A reopened incident must return to INVESTIGATING");
            }
            closedAt = null;
        } else if (!isValidTransition(status, next)) {
            throw new IllegalStateException("Invalid incident transition: " + status + " -> " + next);
        }
        status = next;
        updatedAt = now;
        if (next == Status.CLOSED) closedAt = now;
    }

    private boolean isValidTransition(Status current, Status next) {
        return (current == Status.OPEN && next == Status.INVESTIGATING)
            || (current == Status.INVESTIGATING && next == Status.MITIGATED)
            || (current == Status.MITIGATED && next == Status.CLOSED);
    }
}
