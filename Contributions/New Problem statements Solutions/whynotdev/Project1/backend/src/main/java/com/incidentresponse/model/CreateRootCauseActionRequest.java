package com.incidentresponse.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CreateRootCauseActionRequest(
        @NotBlank(message = "Action description is required") String description,
        @NotBlank(message = "Action owner is required") String owner,
        @NotBlank(message = "Action due date is required") String dueDate,
        @Pattern(regexp = "OPEN|COMPLETE", message = "Action status is invalid") String status) {
}