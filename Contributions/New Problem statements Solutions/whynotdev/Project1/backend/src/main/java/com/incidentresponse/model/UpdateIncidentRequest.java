package com.incidentresponse.model;

import jakarta.validation.constraints.Pattern;

public record UpdateIncidentRequest(
        @Pattern(regexp = "P1|P2|P3", message = "Severity must be P1, P2, or P3") String severity,
        @Pattern(regexp = "OPEN|IN_PROGRESS|MITIGATED|CLOSED", message = "Status is invalid") String status,
        String owner,
        String impactedService) {
}