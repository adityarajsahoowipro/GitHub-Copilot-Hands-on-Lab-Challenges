package com.incidentresponse.model;

import java.time.Instant;

public record Incident(
        String incidentId,
        String title,
        String description,
        String severity,
        String status,
        String owner,
        String impactedService,
        Instant createdAt,
        Instant updatedAt) {
}
