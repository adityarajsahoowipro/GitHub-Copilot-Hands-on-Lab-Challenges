import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import RcaPage from '../RcaPage.jsx';
import * as rcaService from '../../services/rcaService.js';
import * as incidentService from '../../services/incidentService.js';

vi.mock('../../services/rcaService.js');
vi.mock('../../services/incidentService.js');

const baseRca = {
  incidentId: 'INC-1001',
  incidentSummary: 'Original summary.',
  rootCause: 'Original root cause.',
  impactedServices: ['checkout-service'],
  resolution: 'Original resolution.',
  lessonsLearned: 'Original lessons.',
  recommendations: ['Original recommendation.'],
  generatedAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z'
};

const savedRca = {
  ...baseRca,
  rootCause: 'TTL misconfiguration in the cache layer.',
  updatedAt: '2026-02-02T12:00:00.000Z'
};

const baseIncident = {
  incidentId: 'INC-1001',
  title: 'Checkout Service Failure',
  status: 'OPEN',
  updatedAt: '2026-01-01T10:00:00.000Z',
  history: [
    { type: 'INCIDENT_CREATED', message: 'Incident created.', timestamp: '2026-01-01T09:00:00.000Z' },
    {
      type: 'RCA_GENERATED',
      message: 'RCA draft generated and requires human review.',
      timestamp: '2026-01-01T10:00:00.000Z'
    }
  ]
};

const incidentAfterSave = {
  ...baseIncident,
  updatedAt: '2026-02-02T12:00:00.000Z',
  history: [
    ...baseIncident.history,
    { type: 'RCA_UPDATED', message: 'RCA reviewed and updated.', timestamp: '2026-02-02T12:00:00.000Z' }
  ]
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/incidents/INC-1001/rca']}>
      <Routes>
        <Route path="/incidents/:incidentId/rca" element={<RcaPage />} />
      </Routes>
    </MemoryRouter>
  );
}

async function saveWithRootCause(value) {
  const rootCause = await screen.findByLabelText(/root cause/i);
  fireEvent.change(rootCause, { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: /save rca/i }));
}

beforeEach(() => {
  vi.resetAllMocks();
  rcaService.getRca.mockResolvedValue(baseRca);
  incidentService.getIncident.mockResolvedValue(baseIncident);
});

describe('RcaPage save flow', () => {
  it('sends the edited fields to updateRca', async () => {
    rcaService.updateRca.mockResolvedValue(savedRca);

    renderPage();
    await saveWithRootCause('TTL misconfiguration in the cache layer.');

    await waitFor(() =>
      expect(rcaService.updateRca).toHaveBeenCalledWith(
        'INC-1001',
        expect.objectContaining({ rootCause: 'TTL misconfiguration in the cache layer.' })
      )
    );
  });

  it('shows the saved values and the new updatedAt without a manual refresh', async () => {
    rcaService.updateRca.mockResolvedValue(savedRca);
    rcaService.getRca.mockResolvedValueOnce(baseRca).mockResolvedValue(savedRca);
    incidentService.getIncident.mockResolvedValueOnce(baseIncident).mockResolvedValue(incidentAfterSave);

    renderPage();
    expect(await screen.findAllByText(/jan 1, 2026/i)).not.toHaveLength(0);

    await saveWithRootCause('TTL misconfiguration in the cache layer.');

    expect(await screen.findByText(/rca updated successfully\./i)).toBeInTheDocument();
    expect(screen.getByLabelText(/root cause/i)).toHaveValue('TTL misconfiguration in the cache layer.');
    expect(screen.getAllByText(/feb 2, 2026/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it('refetches the RCA from the backend after saving', async () => {
    rcaService.updateRca.mockResolvedValue(savedRca);
    rcaService.getRca.mockResolvedValueOnce(baseRca).mockResolvedValue(savedRca);

    renderPage();
    await screen.findByLabelText(/root cause/i);
    expect(rcaService.getRca).toHaveBeenCalledTimes(1);

    await saveWithRootCause('TTL misconfiguration in the cache layer.');

    await waitFor(() => expect(rcaService.getRca).toHaveBeenCalledTimes(2));
  });

  it('shows the new RCA_UPDATED timeline entry immediately', async () => {
    rcaService.updateRca.mockResolvedValue(savedRca);
    rcaService.getRca.mockResolvedValue(savedRca);
    incidentService.getIncident.mockResolvedValueOnce(baseIncident).mockResolvedValue(incidentAfterSave);

    renderPage();
    await screen.findByLabelText(/root cause/i);
    expect(screen.queryByText(/rca reviewed and updated\./i)).not.toBeInTheDocument();

    await saveWithRootCause('TTL misconfiguration in the cache layer.');

    expect(await screen.findByText(/rca reviewed and updated\./i)).toBeInTheDocument();
  });

  it('disables the Save button while the request is in progress and re-enables it after', async () => {
    let resolveUpdate;
    rcaService.updateRca.mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );
    rcaService.getRca.mockResolvedValue(savedRca);

    renderPage();
    await saveWithRootCause('TTL misconfiguration in the cache layer.');

    const button = await screen.findByRole('button', { name: /saving/i });
    expect(button).toBeDisabled();

    resolveUpdate(savedRca);
    await waitFor(() => expect(screen.getByRole('button', { name: /save rca/i })).toBeEnabled());
  });

  it('shows validation errors and keeps the form editable on a 400', async () => {
    rcaService.updateRca.mockRejectedValue({
      status: 400,
      message: 'Invalid RCA data.',
      errors: ['rootCause cannot be blank.']
    });

    renderPage();
    await saveWithRootCause('   ');

    expect(await screen.findByText(/rootcause cannot be blank\./i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save rca/i })).toBeEnabled();
  });
});
