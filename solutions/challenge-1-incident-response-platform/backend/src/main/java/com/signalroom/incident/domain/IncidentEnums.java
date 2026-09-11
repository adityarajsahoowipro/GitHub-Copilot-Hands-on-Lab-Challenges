package com.signalroom.incident.domain;

public final class IncidentEnums {
    private IncidentEnums() { }

    public enum Severity { P1, P2, P3 }
    public enum Status { OPEN, INVESTIGATING, MITIGATED, CLOSED }
}
