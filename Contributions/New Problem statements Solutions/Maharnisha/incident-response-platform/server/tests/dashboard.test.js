import request from 'supertest';
import app from '../src/app.js';
import { resetTestData } from './testUtils.js';

beforeEach(async () => {
  await resetTestData();
  await request(app).post('/api/incidents').send({
    title: 'Alpha outage',
    severity: 'P1',
    owner: 'Asha',
    impactedService: 'svc-a'
  });
  await request(app).post('/api/incidents').send({
    title: 'Beta slowdown',
    severity: 'P2',
    owner: 'Miguel',
    impactedService: 'svc-b'
  });
  const closedRes = await request(app).post('/api/incidents').send({
    title: 'Gamma glitch',
    severity: 'P3',
    owner: 'Priya',
    impactedService: 'svc-c'
  });
  const id = closedRes.body.data.incidentId;
  await request(app).patch(`/api/incidents/${id}`).send({ status: 'INVESTIGATING' });
  await request(app).patch(`/api/incidents/${id}`).send({ status: 'MITIGATED' });
  await request(app).patch(`/api/incidents/${id}`).send({ status: 'CLOSED' });
});

describe('GET /api/dashboard/metrics', () => {
  it('returns correct total and status counts', async () => {
    const res = await request(app).get('/api/dashboard/metrics');
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.byStatus.OPEN).toBe(2);
    expect(res.body.data.byStatus.CLOSED).toBe(1);
  });

  it('returns correct severity counts', async () => {
    const res = await request(app).get('/api/dashboard/metrics');
    expect(res.body.data.bySeverity.P1).toBe(1);
    expect(res.body.data.bySeverity.P2).toBe(1);
    expect(res.body.data.bySeverity.P3).toBe(1);
  });
});

describe('GET /api/incidents - filters, search, sort', () => {
  it('filters by status', async () => {
    const res = await request(app).get('/api/incidents').query({ status: 'CLOSED' });
    expect(res.body.data).toHaveLength(1);
  });

  it('filters by severity', async () => {
    const res = await request(app).get('/api/incidents').query({ severity: 'P1' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].severity).toBe('P1');
  });

  it('searches titles case-insensitively', async () => {
    const res = await request(app).get('/api/incidents').query({ search: 'ALPHA' });
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toMatch(/Alpha/);
  });

  it('sorts by severity ascending (P1 first)', async () => {
    const res = await request(app).get('/api/incidents').query({ sortBy: 'severity', order: 'asc' });
    expect(res.body.data[0].severity).toBe('P1');
  });

  it('sorts by createdAt descending', async () => {
    const res = await request(app).get('/api/incidents').query({ sortBy: 'createdAt', order: 'desc' });
    const dates = res.body.data.map((i) => new Date(i.createdAt).getTime());
    expect(dates[0]).toBeGreaterThanOrEqual(dates[dates.length - 1]);
  });

  it('rejects an unsupported query value with 400', async () => {
    const res = await request(app).get('/api/incidents').query({ status: 'NOT_A_STATUS' });
    expect(res.status).toBe(400);
  });
});
