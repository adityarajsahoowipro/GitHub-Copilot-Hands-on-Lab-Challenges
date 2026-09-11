package com.incidentresponse.model;

import jakarta.validation.constraints.Pattern;

public record UpdateRootCauseActionRequest(
        @Pattern(regexp = "OPEN|COMPLETE", message = "Action status is invalid") String status) {
}