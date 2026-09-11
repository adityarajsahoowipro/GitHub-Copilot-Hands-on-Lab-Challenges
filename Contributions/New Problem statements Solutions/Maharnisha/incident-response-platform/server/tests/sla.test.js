import request from 'supertest';
import app from '../src/app.js';
import { resetTestData } from './testUtils.js';
import { computeSla, SLA_STATUS } from '../src/utils/slaUtils.js';

describe('computeSla (pure unit tests)', () => {
  it('returns WITHIN_SLA when comfortably inside the target', () => {
    const incident = { severity: 'P3', status: 'OPEN', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() };
    const result = computeSla(incident);
    expect(result.status).toBe(SLA_STATUS.WITHIN_SLA);
  });

  it('returns APPROACHING_SLA when 25% or less time remains', () => {
    // P2 target = 4h. 3.1h elapsed leaves ~22.5% remaining.
    const incident = { severity: 'P2', status: 'OPEN', createdAt: new Date(Date.now() - 3.1 * 60 * 60 * 1000).toISOString() };
    const result = computeSla(incident);
    expect(result.status).toBe(SLA_STATUS.APPROACHING_SLA);
  });

  it('returns SLA_BREACHED once the deadline has passed', () => {
    const incident = { severity: 'P1', status: 'OPEN', createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() };
    const result = computeSla(incident);
    expect(result.status).toBe(SLA_STATUS.SLA_BREACHED);
    expect(result.requiresEscalation).toBe(true);
  });

  it('treats exactly 25% remaining as APPROACHING_SLA (boundary)', () => {
    // P1 target = 2h = 7,200,000 ms. 25% remaining means 1,800,000 ms remaining => elapsed 5,400,000 ms (1.5h).
    const createdAt = new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString();
    const result = computeSla({ severity: 'P1', status: 'OPEN', createdAt });
    expect(result.status).toBe(SLA_STATUS.APPROACHING_SLA);
  });

  it('treats the exact deadline instant as SLA_BREACHED (boundary)', () => {
    const now = new Date();
    const createdAt = new Date(now.getTime() - 2 * 60 * 60 * 1000); // exactly 2h ago, P1 target 2h
    const result = computeSla({ severity: 'P1', status: 'OPEN', createdAt: createdAt.toISOString() }, now);
    expect(result.status).toBe(SLA_STATUS.SLA_BREACHED);
  });

  it('returns NOT_APPLICABLE for closed incidents', () => {
    const incident = { severity: 'P1', status: 'CLOSED', createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() };
    const result = computeSla(incident);
    expect(result.status).toBe(SLA_STATUS.NOT_APPLICABLE);
  });

  it('handles an invalid timestamp without crashing', () => {
    const incident = { severity: 'P1', status: 'OPEN', createdAt: 'not-a-date' };
    const result = computeSla(incident);
    expect(result.status).toBe(SLA_STATUS.NOT_APPLICABLE);
  });
});

describe('POST /api/incidents/evaluate-sla', () => {
  beforeEach(async () => {
    await resetTestData();
  });

  it('records exactly one SLA_BREACHED history entry, even after repeated calls', async () => {
    const created = await request(app).post('/api/incidents').send({
      title: 'Legacy job failing silently',
      severity: 'P1',
      owner: 'Asha',
      impactedService: 'batch-service'
    });
    const id = created.body.data.incidentId;

    // Force this incident's createdAt far enough in the past to be breached, via a raw file edit through the repository.
    const { getAllIncidents, replaceAllIncidents } = await import('../src/repositories/incidentRepository.js');
    const incidents = await getAllIncidents();
    incidents[0].createdAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    await replaceAllIncidents(incidents);

    await request(app).post('/api/incidents/evaluate-sla');
    await request(app).post('/api/incidents/evaluate-sla');

    const incidentRes = await request(app).get(`/api/incidents/${id}`);
    const breachEntries = incidentRes.body.data.history.filter((h) => h.type === 'SLA_BREACHED');
    expect(breachEntries).toHaveLength(1);
  });
});
