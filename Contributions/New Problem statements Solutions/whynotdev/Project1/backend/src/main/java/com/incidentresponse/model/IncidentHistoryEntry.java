package com.incidentresponse.model;

import java.time.Instant;

public record IncidentHistoryEntry(String type, String message, Instant recordedAt) {
}