import request from 'supertest';
import app from '../src/app.js';
import { resetTestData } from './testUtils.js';

async function createIncident() {
  const res = await request(app).post('/api/incidents').send({
    title: 'Cache layer returning stale data',
    description: 'Users see outdated prices. ERR-502 seen in logs.',
    severity: 'P2',
    owner: 'Daniel',
    impactedService: 'cache-service'
  });
  return res.body.data.incidentId;
}

beforeEach(async () => {
  await resetTestData();
});

describe('POST /api/incidents/:incidentId/rca/generate', () => {
  it('generates a draft RCA for an existing incident', async () => {
    const id = await createIncident();
    const res = await request(app).post(`/api/incidents/${id}/rca/generate`);
    expect(res.status).toBe(201);
    expect(res.body.data.incidentId).toBe(id);
    expect(res.body.data.rootCause).toMatch(/review/i);
  });

  it('adds an RCA_GENERATED history entry to the incident', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const incidentRes = await request(app).get(`/api/incidents/${id}`);
    expect(incidentRes.body.data.history.some((h) => h.type === 'RCA_GENERATED')).toBe(true);
  });

  it('rejects generation for an unknown incident with 404', async () => {
    const res = await request(app).post('/api/incidents/INC-9999/rca/generate');
    expect(res.status).toBe(404);
  });

  it('rejects duplicate generation with 409', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const res = await request(app).post(`/api/incidents/${id}/rca/generate`);
    expect(res.status).toBe(409);
  });
});

describe('GET/PUT /api/incidents/:incidentId/rca', () => {
  it('retrieves a generated RCA', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const res = await request(app).get(`/api/incidents/${id}/rca`);
    expect(res.status).toBe(200);
    expect(res.body.data.incidentId).toBe(id);
  });

  it('updates an RCA with valid data', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const res = await request(app)
      .put(`/api/incidents/${id}/rca`)
      .send({
        incidentSummary: 'Confirmed stale cache due to expired TTL config.',
        rootCause: 'TTL misconfiguration in the cache layer.',
        impactedServices: ['cache-service'],
        resolution: 'Corrected TTL configuration.',
        lessonsLearned: 'Add alerting on TTL drift.',
        recommendations: ['Add TTL drift alerting.']
      });
    expect(res.status).toBe(200);
    expect(res.body.data.rootCause).toBe('TTL misconfiguration in the cache layer.');
  });

  it('rejects an RCA update with a blank rootCause', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const res = await request(app)
      .put(`/api/incidents/${id}/rca`)
      .send({
        incidentSummary: 'Summary',
        rootCause: '   ',
        impactedServices: ['cache-service'],
        recommendations: []
      });
    expect(res.status).toBe(400);
  });

  it('returns the fully updated RCA that matches a subsequent GET', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    const payload = {
      incidentSummary: 'Confirmed stale cache due to expired TTL config.',
      rootCause: 'TTL misconfiguration in the cache layer.',
      impactedServices: ['cache-service', 'checkout-service'],
      resolution: 'Corrected TTL configuration.',
      lessonsLearned: 'Add alerting on TTL drift.',
      recommendations: ['Add TTL drift alerting.']
    };

    const putRes = await request(app).put(`/api/incidents/${id}/rca`).send(payload);
    const getRes = await request(app).get(`/api/incidents/${id}/rca`);

    expect(putRes.body.success).toBe(true);
    expect(putRes.body.data).toMatchObject(payload);
    expect(putRes.body.data).toEqual(getRes.body.data);
  });

  it('advances updatedAt while preserving generatedAt', async () => {
    const id = await createIncident();
    const generated = await request(app).post(`/api/incidents/${id}/rca/generate`);
    const res = await request(app)
      .put(`/api/incidents/${id}/rca`)
      .send({
        incidentSummary: 'Reviewed summary.',
        rootCause: 'Confirmed root cause.',
        impactedServices: ['cache-service']
      });

    expect(res.body.data.generatedAt).toBe(generated.body.data.generatedAt);
    expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(generated.body.data.updatedAt).getTime()
    );
  });

  it('adds an RCA_UPDATED history entry to the incident', async () => {
    const id = await createIncident();
    await request(app).post(`/api/incidents/${id}/rca/generate`);
    await request(app)
      .put(`/api/incidents/${id}/rca`)
      .send({
        incidentSummary: 'Reviewed summary.',
        rootCause: 'Confirmed root cause.',
        impactedServices: ['cache-service']
      });

    const incidentRes = await request(app).get(`/api/incidents/${id}`);
    expect(incidentRes.body.data.history.some((h) => h.type === 'RCA_UPDATED')).toBe(true);
  });
});
