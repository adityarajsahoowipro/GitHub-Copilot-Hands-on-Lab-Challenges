import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { vi } from 'vitest';
import CreateIncidentPage from '../CreateIncidentPage.jsx';
import * as incidentService from '../../services/incidentService.js';

vi.mock('../../services/incidentService.js');

describe('CreateIncidentPage', () => {
  it('shows field-level validation errors when required fields are missing', async () => {
    render(
      <MemoryRouter>
        <CreateIncidentPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument();
    expect(screen.getByText(/severity is required/i)).toBeInTheDocument();
    expect(screen.getByText(/impacted service is required/i)).toBeInTheDocument();
    expect(incidentService.createIncident).not.toHaveBeenCalled();
  });

  it('submits valid data and calls createIncident', async () => {
    incidentService.createIncident.mockResolvedValue({ incidentId: 'INC-1001' });

    render(
      <MemoryRouter>
        <CreateIncidentPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test incident' } });
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: 'P1' } });
    fireEvent.change(screen.getByLabelText(/impacted service/i), { target: { value: 'api-service' } });
    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    await waitFor(() => expect(incidentService.createIncident).toHaveBeenCalledTimes(1));
  });

  it('shows a server error message when creation fails', async () => {
    incidentService.createIncident.mockRejectedValue({ message: 'Server unavailable', status: 500, errors: [] });

    render(
      <MemoryRouter>
        <CreateIncidentPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Test incident' } });
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: 'P1' } });
    fireEvent.change(screen.getByLabelText(/impacted service/i), { target: { value: 'api-service' } });
    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    expect(await screen.findByText(/server unavailable/i)).toBeInTheDocument();
  });

  it('shows the duplicate message and navigates to the existing incident', async () => {
    incidentService.createIncident.mockRejectedValue({
      status: 409,
      message: 'An active incident with the same title already exists.',
      errors: [],
      existingIncidentId: 'INC-1001'
    });

    render(
      <MemoryRouter initialEntries={['/incidents/new']}>
        <Routes>
          <Route path="/incidents/new" element={<CreateIncidentPage />} />
          <Route path="/incidents/:incidentId" element={<div>Incident detail page</div>} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Checkout Service Failure' } });
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: 'P1' } });
    fireEvent.change(screen.getByLabelText(/impacted service/i), { target: { value: 'checkout-service' } });
    fireEvent.click(screen.getByRole('button', { name: /create incident/i }));

    expect(
      await screen.findByText(/an active incident with the same title already exists/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /view existing incident/i }));

    expect(await screen.findByText(/incident detail page/i)).toBeInTheDocument();
  });
});
