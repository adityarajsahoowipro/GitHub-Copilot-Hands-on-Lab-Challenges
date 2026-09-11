package com.signalroom.incident.api;

import com.signalroom.incident.domain.Incident;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.OffsetDateTime;

import static com.signalroom.incident.domain.IncidentEnums.Severity;
import static com.signalroom.incident.domain.IncidentEnums.Status;

public final class IncidentDtos {
    private IncidentDtos() { }

    public record CreateIncidentRequest(
        @NotBlank String title,
        @NotBlank String description,
        @NotNull Severity severity,
        @NotBlank String owner,
        @NotBlank String impactedService
    ) { }

    public record UpdateIncidentRequest(
        @NotBlank String owner,
        @NotNull Severity severity,
        @NotBlank String impactedService
    ) { }

    public record TransitionRequest(@NotNull Status status) { }

    public record IncidentResponse(
        String incidentId,
        String title,
        String description,
        Severity severity,
        Status status,
        String owner,
        String impactedService,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime closedAt
    ) {
        public static IncidentResponse from(Incident incident) {
            return new IncidentResponse(incident.getIncidentId(), incident.getTitle(), incident.getDescription(), incident.getSeverity(), incident.getStatus(), incident.getOwner(), incident.getImpactedService(), incident.getCreatedAt(), incident.getUpdatedAt(), incident.getClosedAt());
        }
    }
}
