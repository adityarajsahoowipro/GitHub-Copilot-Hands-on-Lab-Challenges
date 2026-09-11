import request from 'supertest';
import app from '../src/app.js';
import { resetTestData } from './testUtils.js';

const validIncident = {
  title: 'Database connection pool exhausted',
  description: 'Connections maxed out during peak traffic.',
  severity: 'P2',
  owner: 'Miguel Santos',
  impactedService: 'orders-service'
};

async function createIncident() {
  const res = await request(app).post('/api/incidents').send(validIncident);
  return res.body.data.incidentId;
}

beforeEach(async () => {
  await resetTestData();
});

describe('PATCH /api/incidents/:incidentId - field updates', () => {
  it('updates owner and records history', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ owner: 'New Owner' });
    expect(res.status).toBe(200);
    expect(res.body.data.owner).toBe('New Owner');
    expect(res.body.data.history.some((h) => h.type === 'OWNER_CHANGED')).toBe(true);
  });

  it('updates severity and records history', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ severity: 'P1' });
    expect(res.status).toBe(200);
    expect(res.body.data.severity).toBe('P1');
    expect(res.body.data.history.some((h) => h.type === 'SEVERITY_CHANGED')).toBe(true);
  });

  it('updates impactedService and records history', async () => {
    const id = await createIncident();
    const res = await request(app)
      .patch(`/api/incidents/${id}`)
      .send({ impactedService: 'billing-service' });
    expect(res.status).toBe(200);
    expect(res.body.data.impactedService).toBe('billing-service');
    expect(res.body.data.history.some((h) => h.type === 'IMPACTED_SERVICE_CHANGED')).toBe(true);
  });

  it('rejects an update with no supported fields', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({});
    expect(res.status).toBe(400);
  });

  it('rejects updates to unknown incidents with 404', async () => {
    const res = await request(app).patch('/api/incidents/INC-9999').send({ owner: 'Someone' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/incidents/:incidentId - status transitions', () => {
  it('allows OPEN -> INVESTIGATING', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INVESTIGATING');
  });

  it('allows INVESTIGATING -> MITIGATED', async () => {
    const id = await createIncident();
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('MITIGATED');
  });

  it('allows MITIGATED -> CLOSED', async () => {
    const id = await createIncident();
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'CLOSED' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('CLOSED');
  });

  it('rejects OPEN -> CLOSED with 409 and a readable transition message', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'CLOSED' });
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid status transition: OPEN → CLOSED');
  });

  it('rejects OPEN -> MITIGATED with 409', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Invalid status transition: OPEN → MITIGATED');
  });

  it('rejects CLOSED -> OPEN with 409', async () => {
    const id = await createIncident();
    for (const status of ['INVESTIGATING', 'MITIGATED', 'CLOSED']) {
      await request(app).patch(`/api/incidents/${id}`).send({ status });
    }
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'OPEN' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Invalid status transition: CLOSED → OPEN');
  });

  it('rejects CLOSED -> MITIGATED with 409', async () => {
    const id = await createIncident();
    for (const status of ['INVESTIGATING', 'MITIGATED', 'CLOSED']) {
      await request(app).patch(`/api/incidents/${id}`).send({ status });
    }
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
    expect(res.status).toBe(409);
  });

  it('rejects CLOSED -> INVESTIGATING with 409', async () => {
    const id = await createIncident();
    for (const status of ['INVESTIGATING', 'MITIGATED', 'CLOSED']) {
      await request(app).patch(`/api/incidents/${id}`).send({ status });
    }
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    expect(res.status).toBe(409);
  });

  it('rejects MITIGATED -> OPEN with 409', async () => {
    const id = await createIncident();
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'OPEN' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('Invalid status transition: MITIGATED → OPEN');
  });

  it('leaves the stored status unchanged after a rejected transition', async () => {
    const id = await createIncident();
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'CLOSED' });
    const res = await request(app).get(`/api/incidents/${id}`);
    expect(res.body.data.status).toBe('OPEN');
  });

  it('updates status alongside other editable fields in one request', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({
      status: 'INVESTIGATING',
      owner: 'Nina Patel',
      severity: 'P1',
      impactedService: 'billing-service'
    });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('INVESTIGATING');
    expect(res.body.data.owner).toBe('Nina Patel');
    expect(res.body.data.severity).toBe('P1');
    expect(res.body.data.impactedService).toBe('billing-service');
  });

  it('bumps updatedAt when the status changes', async () => {
    const id = await createIncident();
    const before = await request(app).get(`/api/incidents/${id}`);
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before.body.data.updatedAt).getTime()
    );
  });

  it('records a STATUS_UPDATED history entry with previous and new values', async () => {
    const id = await createIncident();
    const res = await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
    const entry = res.body.data.history.find((h) => h.type === 'STATUS_UPDATED');
    expect(entry.message).toBe('Status changed from OPEN to INVESTIGATING');
    expect(entry.previousValue).toBe('OPEN');
    expect(entry.newValue).toBe('INVESTIGATING');
    expect(entry.timestamp).toBeDefined();
  });

  it('does not record history for a rejected transition', async () => {
    const id = await createIncident();
    await request(app).patch(`/api/incidents/${id}`).send({ status: 'CLOSED' });
    const res = await request(app).get(`/api/incidents/${id}`);
    expect(res.body.data.history.some((h) => h.type === 'STATUS_UPDATED')).toBe(false);
  });
});
