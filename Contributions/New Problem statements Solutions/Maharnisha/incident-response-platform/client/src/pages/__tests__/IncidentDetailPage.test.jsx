import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import IncidentDetailPage from '../IncidentDetailPage.jsx';
import * as incidentService from '../../services/incidentService.js';

vi.mock('../../services/incidentService.js');

const baseIncident = {
  incidentId: 'INC-1001',
  title: 'Checkout Service Failure',
  description: 'Checkout requests failing.',
  severity: 'P1',
  status: 'OPEN',
  owner: 'Asha Kapoor',
  impactedService: 'checkout-service',
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  sla: { status: 'WITHIN_SLA', targetMinutes: 120, elapsedMinutes: 10, remainingMinutes: 110 },
  history: [
    { type: 'INCIDENT_CREATED', message: 'Incident created.', timestamp: '2026-01-01T10:00:00.000Z' }
  ]
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/incidents/INC-1001']}>
      <Routes>
        <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  incidentService.getIncident.mockResolvedValue(baseIncident);
  incidentService.getRelatedIncidents.mockResolvedValue([]);
});

describe('IncidentDetailPage status editing', () => {
  it('pre-populates the status dropdown with the current status', async () => {
    renderPage();
    const select = await screen.findByLabelText(/^status$/i);
    expect(select).toHaveValue('OPEN');
  });

  it('sends the selected status to updateIncident and refreshes the UI', async () => {
    const updated = {
      ...baseIncident,
      status: 'INVESTIGATING',
      updatedAt: '2026-01-01T11:00:00.000Z',
      history: [
        ...baseIncident.history,
        {
          type: 'STATUS_UPDATED',
          message: 'Status changed from OPEN to INVESTIGATING',
          previousValue: 'OPEN',
          newValue: 'INVESTIGATING',
          timestamp: '2026-01-01T11:00:00.000Z'
        }
      ]
    };
    incidentService.updateIncident.mockResolvedValue(updated);

    renderPage();
    const select = await screen.findByLabelText(/^status$/i);
    fireEvent.change(select, { target: { value: 'INVESTIGATING' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(incidentService.updateIncident).toHaveBeenCalledWith('INC-1001', { status: 'INVESTIGATING' })
    );

    expect(await screen.findByText(/incident updated successfully/i)).toBeInTheDocument();
    expect(await screen.findByText(/status changed from open to investigating/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^status$/i)).toHaveValue('INVESTIGATING');
  });

  it('shows an error notification when the transition is rejected', async () => {
    incidentService.updateIncident.mockRejectedValue({
      status: 409,
      message: 'Invalid status transition: OPEN → CLOSED',
      errors: []
    });

    renderPage();
    const select = await screen.findByLabelText(/^status$/i);
    fireEvent.change(select, { target: { value: 'CLOSED' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(incidentService.updateIncident).toHaveBeenCalledTimes(1));
    expect(await screen.findAllByText(/invalid status transition: open → closed/i)).not.toHaveLength(0);
  });

  it('does not call the API when nothing changed', async () => {
    renderPage();
    await screen.findByLabelText(/^status$/i);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    expect(await screen.findByText(/no changes to save/i)).toBeInTheDocument();
    expect(incidentService.updateIncident).not.toHaveBeenCalled();
  });

  it('sends status together with other edited fields', async () => {
    incidentService.updateIncident.mockResolvedValue({ ...baseIncident, status: 'INVESTIGATING', owner: 'Nina Patel' });

    renderPage();
    const select = await screen.findByLabelText(/^status$/i);
    fireEvent.change(select, { target: { value: 'INVESTIGATING' } });
    fireEvent.change(screen.getByLabelText(/owner/i), { target: { value: 'Nina Patel' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(incidentService.updateIncident).toHaveBeenCalledWith('INC-1001', {
        status: 'INVESTIGATING',
        owner: 'Nina Patel'
      })
    );
  });
});
