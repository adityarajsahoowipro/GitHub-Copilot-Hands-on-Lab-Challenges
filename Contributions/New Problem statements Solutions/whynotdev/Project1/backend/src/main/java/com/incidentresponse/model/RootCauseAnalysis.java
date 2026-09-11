package com.incidentresponse.model;

import java.time.Instant;

public record RootCauseAnalysis(
        String incidentId,
        String incidentSummary,
        String rootCause,
        String impactedServices,
        String resolution,
        String lessonsLearned,
        String recommendations,
        Instant generatedAt,
        Instant updatedAt) {
}