package com.incidentresponse.model;

import jakarta.validation.constraints.NotBlank;

public record UpdateRootCauseAnalysisRequest(
        @NotBlank(message = "Incident summary is required") String incidentSummary,
        @NotBlank(message = "Root cause is required") String rootCause,
        @NotBlank(message = "Impacted services are required") String impactedServices,
        @NotBlank(message = "Resolution is required") String resolution,
        @NotBlank(message = "Lessons learned are required") String lessonsLearned,
        @NotBlank(message = "Recommendations are required") String recommendations) {
}