import request from 'supertest';
import app from '../src/app.js';
import { resetTestData } from './testUtils.js';

const validIncident = {
  title: 'Payment gateway timeouts',
  description: 'Timeouts observed on checkout.',
  severity: 'P1',
  owner: 'Asha Kapoor',
  impactedService: 'payments-service'
};

beforeEach(async () => {
  await resetTestData();
});

describe('POST /api/incidents', () => {
  it('creates an incident with status OPEN and a readable ID', async () => {
    const res = await request(app).post('/api/incidents').send(validIncident);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.incidentId).toMatch(/^INC-\d+$/);
    expect(res.body.data.status).toBe('OPEN');
    expect(res.body.data.history).toHaveLength(1);
    expect(res.body.data.history[0].type).toBe('INCIDENT_CREATED');
  });

  it('ignores a client-supplied status and forces OPEN', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, status: 'CLOSED' });
    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('rejects a missing title with 400', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects an invalid severity with 400', async () => {
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, severity: 'P9' });
    expect(res.status).toBe(400);
  });

  it('generates unique sequential incident IDs', async () => {
    const first = await request(app).post('/api/incidents').send(validIncident);
    const second = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: 'Second distinct incident' });
    expect(first.body.data.incidentId).not.toBe(second.body.data.incidentId);
  });
});

describe('POST /api/incidents duplicate detection', () => {
  it('rejects an exact duplicate title with 409 and the standard payload', async () => {
    const first = await request(app).post('/api/incidents').send(validIncident);
    const res = await request(app).post('/api/incidents').send(validIncident);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('An active incident with the same title already exists.');
    expect(res.body.existingIncidentId).toBe(first.body.data.incidentId);
  });

  it('detects duplicates case-insensitively', async () => {
    const first = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: 'Checkout Service Failure' });
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: 'checkout service failure' });

    expect(res.status).toBe(409);
    expect(res.body.existingIncidentId).toBe(first.body.data.incidentId);
  });

  it('detects duplicates after trimming surrounding whitespace', async () => {
    const first = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: 'Checkout Service Failure' });
    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: '  Checkout Service Failure  ' });

    expect(res.status).toBe(409);
    expect(res.body.existingIncidentId).toBe(first.body.data.incidentId);
  });

  it('does not create a second incident when a duplicate is rejected', async () => {
    await request(app).post('/api/incidents').send(validIncident);
    await request(app).post('/api/incidents').send(validIncident);

    const list = await request(app).get('/api/incidents');
    expect(list.body.data).toHaveLength(1);
  });

  it('allows creating a new incident when the matching one is CLOSED', async () => {
    const first = await request(app).post('/api/incidents').send(validIncident);
    const { incidentId } = first.body.data;

    for (const status of ['INVESTIGATING', 'MITIGATED', 'CLOSED']) {
      await request(app).patch(`/api/incidents/${incidentId}`).send({ status });
    }

    const res = await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: '  payment GATEWAY timeouts  ' });

    expect(res.status).toBe(201);
    expect(res.body.data.incidentId).not.toBe(incidentId);
  });
});

describe('GET /api/incidents', () => {
  it('lists all created incidents', async () => {
    await request(app).post('/api/incidents').send(validIncident);
    await request(app)
      .post('/api/incidents')
      .send({ ...validIncident, title: 'Search latency spike' });
    const res = await request(app).get('/api/incidents');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

describe('GET /api/incidents/:incidentId', () => {
  it('retrieves a single incident by ID', async () => {
    const created = await request(app).post('/api/incidents').send(validIncident);
    const res = await request(app).get(`/api/incidents/${created.body.data.incidentId}`);
    expect(res.status).toBe(200);
    expect(res.body.data.incidentId).toBe(created.body.data.incidentId);
    expect(res.body.data.sla).toBeDefined();
  });

  it('returns 404 for an unknown incident', async () => {
    const res = await request(app).get('/api/incidents/INC-9999');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
