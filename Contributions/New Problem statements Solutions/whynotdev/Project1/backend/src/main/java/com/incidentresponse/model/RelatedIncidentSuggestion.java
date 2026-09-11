package com.incidentresponse.model;

import java.util.List;

public record RelatedIncidentSuggestion(Incident incident, List<String> reasons, boolean linked) {
}