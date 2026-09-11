package com.incidentresponse.model;

import java.time.Instant;

public record RootCauseAction(
        String actionId,
        String incidentId,
        String description,
        String owner,
        String dueDate,
        String status,
        Instant createdAt,
        Instant updatedAt) {
}