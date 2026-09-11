package com.incidentresponse.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record CreateIncidentRequest(
        @NotBlank(message = "Title is required") String title,
        String description,
        @NotNull(message = "Severity is required")
        @Pattern(regexp = "P1|P2|P3", message = "Severity must be P1, P2, or P3") String severity,
        String owner,
        @NotBlank(message = "Impacted service is required") String impactedService) {
}