package com.incidentresponse.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.incidentresponse.model.CreateIncidentRequest;
import com.incidentresponse.model.UpdateIncidentRequest;
import com.incidentresponse.model.UpdateRootCauseAnalysisRequest;
import com.incidentresponse.model.CreateRootCauseActionRequest;
import com.incidentresponse.repository.InMemoryIncidentRepository;
import org.junit.jupiter.api.Test;

class IncidentServiceTest {
    @Test
    void createsIncidentsWithUniqueIdsAndOpenStatus() {
        var service = service();

        var firstIncident = service.create(request("Checkout Service"));
        var secondIncident = service.create(request("Payment Service"));

        assertEquals("INC-1001", firstIncident.incidentId());
        assertEquals("INC-1002", secondIncident.incidentId());
        assertEquals("OPEN", firstIncident.status());
    }

    @Test
    void rejectsDuplicateImpactedServicesIgnoringCaseAndWhitespace() {
        var service = service();
        service.create(request("Checkout Service"));

        var exception = assertThrows(IllegalArgumentException.class, () -> service.create(request(" checkout service ")));

        assertEquals("An incident has already been raised for checkout service.", exception.getMessage());
    }

    @Test
    void requiresLifecycleProgressionBeforeClosingAndAllowsReopening() {
        var service = service();
        var incident = service.create(request("Checkout Service"));

        var exception = assertThrows(IllegalArgumentException.class, () -> service.update(incident.incidentId(), update("CLOSED")));
        assertEquals("Cannot change from OPEN to CLOSED. Follow OPEN -> IN_PROGRESS -> MITIGATED -> CLOSED. An incident cannot be closed without being in progress.", exception.getMessage());

        service.update(incident.incidentId(), update("IN_PROGRESS"));
        service.update(incident.incidentId(), update("MITIGATED"));
        var closed = service.update(incident.incidentId(), update("CLOSED"));
        var reopened = service.update(incident.incidentId(), update("IN_PROGRESS"));

        assertEquals("CLOSED", closed.status());
        assertEquals("IN_PROGRESS", reopened.status());
    }

    @Test
    void keepsSavedRcaWhenGenerateIsRequestedAgain() {
        var service = service();
        var incident = service.create(request("Checkout Service"));
        service.generateRca(incident.incidentId());
        var savedRca = service.updateRca(incident.incidentId(), new UpdateRootCauseAnalysisRequest(
                "Payment failure", "A configuration error", "Checkout Service", "Configuration reverted",
                "Verify configuration changes", "Add deployment validation"));

        var generatedAgain = service.generateRca(incident.incidentId());

        assertSame(savedRca, generatedAgain);
        assertEquals("A configuration error", generatedAgain.rootCause());
        assertEquals(1, service.findAllRcas().size());
    }

    @Test
    void createsAccountableRcaActionsAndRecordsActivity() {
        var service = service();
        var incident = service.create(request("Checkout Service"));
        service.generateRca(incident.incidentId());

        var action = service.createRcaAction(incident.incidentId(), new CreateRootCauseActionRequest("Add deployment validation", "Platform Team", "2026-09-20", "OPEN"));
        var completed = service.updateRcaAction(incident.incidentId(), action.actionId(), new com.incidentresponse.model.UpdateRootCauseActionRequest("COMPLETE"));

        assertEquals("Platform Team", action.owner());
        assertEquals("COMPLETE", completed.status());
        assertEquals(1, service.findRcaActions(incident.incidentId()).size());
        assertEquals("RCA_ACTION_UPDATED", service.findHistory(incident.incidentId()).get(3).type());
    }

    private CreateIncidentRequest request(String impactedService) {
        return new CreateIncidentRequest("Checkout is unavailable", "Customers cannot pay", "P1", "Payments Team", impactedService);
    }

    private UpdateIncidentRequest update(String status) {
        return new UpdateIncidentRequest(null, status, null, null);
    }

    private IncidentService service() {
        return new IncidentService(new InMemoryIncidentRepository());
    }
}
