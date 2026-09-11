import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import IncidentListPage from '../IncidentListPage.jsx';
import * as incidentService from '../../services/incidentService.js';

vi.mock('../../services/incidentService.js');

const sampleIncident = {
  incidentId: 'INC-1001',
  title: 'Sample outage',
  severity: 'P1',
  status: 'OPEN',
  owner: 'Asha',
  impactedService: 'api-service',
  createdAt: new Date().toISOString(),
  sla: { status: 'WITHIN_SLA' }
};

describe('IncidentListPage', () => {
  it('shows a loading state, then renders incidents', async () => {
    incidentService.listIncidents.mockResolvedValue([sampleIncident]);

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    expect(screen.getByText(/loading incidents/i)).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Sample outage')).toBeInTheDocument());
    expect(screen.getByText(/1 incident found/i)).toBeInTheDocument();
  });

  it('shows an empty state when no incidents match', async () => {
    incidentService.listIncidents.mockResolvedValue([]);

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/no incidents match/i)).toBeInTheDocument());
  });

  it('shows an error state when the request fails', async () => {
    incidentService.listIncidents.mockRejectedValue({ message: 'Network error', status: 0, errors: [] });

    render(
      <MemoryRouter>
        <IncidentListPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/network error/i)).toBeInTheDocument());
  });
});
