import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getDashboardMetrics } from '../services/dashboardService.js';
import { listIncidents, evaluateSla } from '../services/incidentService.js';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SlaBadge from '../components/SlaBadge.jsx';
import Card from '../components/Card.jsx';
import MetricCard from '../components/MetricCard.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SkeletonRows from '../components/SkeletonRows.jsx';
import HistoryTimeline from '../components/HistoryTimeline.jsx';
import { IconTotal, IconIncidents, IconClock, IconSla, IconService } from '../components/icons.jsx';
import { formatDateTime } from '../utils/formatters.js';
import { STATUSES, SEVERITIES } from '../utils/constants.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const initialFilters = { status: '', severity: '', owner: '', impactedService: '', search: '' };
const STATUS_COLORS = { OPEN: '#0284c7', INVESTIGATING: '#7c3aed', MITIGATED: '#10b981', CLOSED: '#94a3b8' };
const SLA_COLORS = { WITHIN_SLA: '#10b981', APPROACHING_SLA: '#f59e0b', SLA_BREACHED: '#ef4444', NOT_APPLICABLE: '#94a3b8' };

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [metricsStatus, setMetricsStatus] = useState('loading');
  const [filters, setFilters] = useState(initialFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [incidents, setIncidents] = useState([]);
  const [tableStatus, setTableStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    evaluateSla()
      .catch(() => {})
      .finally(() => {
        getDashboardMetrics()
          .then((data) => {
            if (!cancelled) {
              setMetrics(data);
              setMetricsStatus('ready');
            }
          })
          .catch((err) => {
            if (!cancelled) {
              setErrorMessage(err.message);
              setMetricsStatus('error');
            }
          });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const queryParams = useMemo(
    () => ({
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      owner: filters.owner || undefined,
      impactedService: filters.impactedService || undefined,
      search: debouncedSearch || undefined
    }),
    [filters.status, filters.severity, filters.owner, filters.impactedService, debouncedSearch]
  );

  useEffect(() => {
    let cancelled = false;
    setTableStatus('loading');
    listIncidents(queryParams)
      .then((data) => {
        if (!cancelled) {
          setIncidents(data);
          setTableStatus('ready');
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err.message);
          setTableStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  const updateFilter = (field) => (event) => setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  const clearFilters = () => setFilters(initialFilters);

  const statusChartData = metrics
    ? STATUSES.map((s) => ({ name: s, count: metrics.byStatus[s] }))
    : [];
  const severityChartData = metrics
    ? SEVERITIES.map((s) => ({ name: s, count: metrics.bySeverity[s] }))
    : [];
  const slaChartData = metrics ? Object.entries(metrics.bySla).map(([name, count]) => ({ name, count })) : [];

  const topServices = useMemo(() => {
    const counts = new Map();
    incidents.forEach((incident) => {
      const key = incident.impactedService || 'Unspecified';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const max = sorted.length > 0 ? sorted[0][1] : 0;
    return { sorted, max };
  }, [incidents]);

  const recentActivity = useMemo(() => {
    const entries = incidents.flatMap((incident) =>
      (incident.history || []).map((entry) => ({ ...entry, incidentId: incident.incidentId }))
    );
    return entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 8);
  }, [incidents]);

  const recentIncidents = useMemo(
    () => [...incidents].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 6),
    [incidents]
  );

  return (
    <section className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Real-time overview of incident volume, severity mix and SLA health.</p>
        </div>
      </div>

      {metricsStatus === 'loading' && (
        <>
          <p className="visually-hidden">Loading metrics…</p>
          <SkeletonRows rows={2} columns={4} />
        </>
      )}
      {metricsStatus === 'error' && <p className="server-error" role="alert">{errorMessage}</p>}
      {metricsStatus === 'ready' && metrics && (
        <>
          <div className="metric-cards">
            <MetricCard icon={<IconTotal />} value={metrics.total} label="Total Incidents" />
            <MetricCard icon={<IconIncidents />} value={metrics.byStatus.OPEN} label="Open" tone="danger" />
            <MetricCard icon={<IconIncidents />} value={metrics.byStatus.INVESTIGATING} label="Investigating" tone="warning" />
            <MetricCard icon={<IconIncidents />} value={metrics.byStatus.MITIGATED} label="Mitigated" tone="success" />
            <MetricCard icon={<IconIncidents />} value={metrics.byStatus.CLOSED} label="Closed" />
            <MetricCard icon={<IconIncidents />} value={metrics.bySeverity.P1} label="P1 Incidents" tone="danger" />
            <MetricCard icon={<IconIncidents />} value={metrics.bySeverity.P2} label="P2 Incidents" tone="warning" />
            <MetricCard icon={<IconIncidents />} value={metrics.bySeverity.P3} label="P3 Incidents" />
          </div>

          <div className="metric-cards">
            <MetricCard icon={<IconSla />} value={metrics.bySla.WITHIN_SLA} label="Within SLA" tone="success" />
            <MetricCard icon={<IconClock />} value={metrics.bySla.APPROACHING_SLA} label="Approaching SLA" tone="warning" />
            <MetricCard icon={<IconSla />} value={metrics.bySla.SLA_BREACHED} label="SLA Breached" tone="danger" />
          </div>

          <div className="dashboard-grid">
            <Card title="Incident Status">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={statusChartData} dataKey="count" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {statusChartData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Severity Distribution">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={severityChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Incidents" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="SLA Status">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={slaChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={110} />
                  <Tooltip />
                  <Bar dataKey="count" name="Incidents" radius={[0, 6, 6, 0]}>
                    {slaChartData.map((entry) => (
                      <Cell key={entry.name} fill={SLA_COLORS[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Top Impacted Services" description="Most frequently affected services in the current view.">
              {topServices.sorted.length === 0 ? (
                <EmptyState icon={<IconService />} title="No service data yet" description="Impacted services will appear here once incidents are reported." />
              ) : (
                <ul className="top-services-list">
                  {topServices.sorted.map(([name, count]) => (
                    <li key={name} className="top-service-row">
                      <span className="top-service-name">{name}</span>
                      <span className="top-service-bar-track">
                        <span
                          className="top-service-bar-fill"
                          style={{ width: `${topServices.max ? (count / topServices.max) * 100 : 0}%` }}
                        />
                      </span>
                      <span className="top-service-count">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="card-grid">
            <Card title="Recent Incidents" actions={<Link className="btn btn-secondary btn-sm" to="/incidents">View all</Link>}>
              {recentIncidents.length === 0 ? (
                <EmptyState title="No incidents yet" description="New incidents will show up here as soon as they are reported." />
              ) : (
                <div className="table-wrapper">
                  <table className="incident-table">
                    <thead>
                      <tr>
                        <th scope="col">ID</th>
                        <th scope="col">Title</th>
                        <th scope="col">Severity</th>
                        <th scope="col">Status</th>
                        <th scope="col">SLA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentIncidents.map((incident) => (
                        <tr key={incident.incidentId}>
                          <td><Link to={`/incidents/${incident.incidentId}`}>{incident.incidentId}</Link></td>
                          <td>{incident.title}</td>
                          <td><SeverityBadge severity={incident.severity} /></td>
                          <td><StatusBadge status={incident.status} /></td>
                          <td><SlaBadge status={incident.sla.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card title="Recent Activity">
              {recentActivity.length === 0 ? (
                <EmptyState title="No recent activity" description="Timeline events will appear here as incidents are updated." />
              ) : (
                <HistoryTimeline history={recentActivity} />
              )}
            </Card>
          </div>
        </>
      )}

      <h2>Incident Explorer</h2>
      <div className="filters-bar">
        <div className="form-field">
          <label htmlFor="dash-search">Search title</label>
          <input id="dash-search" type="text" value={filters.search} onChange={updateFilter('search')} />
        </div>
        <div className="form-field">
          <label htmlFor="dash-status">Status</label>
          <select id="dash-status" value={filters.status} onChange={updateFilter('status')}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="dash-severity">Severity</label>
          <select id="dash-severity" value={filters.severity} onChange={updateFilter('severity')}>
            <option value="">All severities</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="dash-owner">Owner</label>
          <input id="dash-owner" type="text" value={filters.owner} onChange={updateFilter('owner')} />
        </div>
        <div className="form-field">
          <label htmlFor="dash-service">Impacted service</label>
          <input id="dash-service" type="text" value={filters.impactedService} onChange={updateFilter('impactedService')} />
        </div>
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button>
      </div>

      {tableStatus === 'loading' && (
        <>
          <p className="visually-hidden">Loading incidents…</p>
          <SkeletonRows />
        </>
      )}
      {tableStatus === 'error' && <p className="server-error" role="alert">{errorMessage}</p>}
      {tableStatus === 'ready' && (
        <>
          <p className="result-count">{incidents.length} incident{incidents.length === 1 ? '' : 's'} found</p>
          {incidents.length === 0 ? (
            <EmptyState title="No incidents match the current filters." description="Try clearing filters or adjusting your search." />
          ) : (
            <div className="table-wrapper">
              <table className="incident-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Title</th>
                    <th scope="col">Severity</th>
                    <th scope="col">Status</th>
                    <th scope="col">SLA</th>
                    <th scope="col">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((incident) => (
                    <tr key={incident.incidentId}>
                      <td><Link to={`/incidents/${incident.incidentId}`}>{incident.incidentId}</Link></td>
                      <td>{incident.title}</td>
                      <td><SeverityBadge severity={incident.severity} /></td>
                      <td><StatusBadge status={incident.status} /></td>
                      <td><SlaBadge status={incident.sla.status} /></td>
                      <td>{formatDateTime(incident.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
