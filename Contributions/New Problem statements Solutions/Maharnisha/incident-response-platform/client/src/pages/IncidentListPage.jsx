import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { listIncidents } from '../services/incidentService.js';
import SeverityBadge from '../components/SeverityBadge.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import SlaBadge from '../components/SlaBadge.jsx';
import EmptyState from '../components/EmptyState.jsx';
import SkeletonRows from '../components/SkeletonRows.jsx';
import { formatDateTime } from '../utils/formatters.js';
import { STATUSES, SEVERITIES, SLA_STATUS_LABELS } from '../utils/constants.js';
import { useDebouncedValue } from '../hooks/useDebouncedValue.js';

const PAGE_SIZE = 10;

export default function IncidentListPage() {
  const [searchParams] = useSearchParams();
  const initialFilters = {
    status: '',
    severity: '',
    owner: '',
    impactedService: '',
    search: searchParams.get('search') || '',
    slaStatus: '',
    sortBy: 'createdAt',
    order: 'desc'
  };
  const [filters, setFilters] = useState(initialFilters);
  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const [incidents, setIncidents] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState('');
  const [page, setPage] = useState(1);

  const queryParams = useMemo(
    () => ({
      status: filters.status || undefined,
      severity: filters.severity || undefined,
      owner: filters.owner || undefined,
      impactedService: filters.impactedService || undefined,
      search: debouncedSearch || undefined,
      slaStatus: filters.slaStatus || undefined,
      sortBy: filters.sortBy || undefined,
      order: filters.order || undefined
    }),
    [filters.status, filters.severity, filters.owner, filters.impactedService, debouncedSearch, filters.slaStatus, filters.sortBy, filters.order]
  );

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    listIncidents(queryParams)
      .then((data) => {
        if (!cancelled) {
          setIncidents(data);
          setStatus('ready');
          setPage(1);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setErrorMessage(err.message);
          setStatus('error');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [queryParams]);

  const updateFilter = (field) => (event) => {
    setFilters((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const clearFilters = () => setFilters(initialFilters);

  const pageCount = Math.max(1, Math.ceil(incidents.length / PAGE_SIZE));
  const pagedIncidents = useMemo(
    () => incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [incidents, page]
  );

  return (
    <section>
      <div className="page-header">
        <div>
          <h1>Incidents</h1>
          <p>Search, filter and triage active and historical incidents.</p>
        </div>
      </div>

      <div className="filters-bar">
        <div className="form-field">
          <label htmlFor="filter-search">Search title</label>
          <input id="filter-search" type="text" value={filters.search} onChange={updateFilter('search')} placeholder="Search by title…" />
        </div>
        <div className="form-field">
          <label htmlFor="filter-status">Status</label>
          <select id="filter-status" value={filters.status} onChange={updateFilter('status')}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter-severity">Severity</label>
          <select id="filter-severity" value={filters.severity} onChange={updateFilter('severity')}>
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter-owner">Owner</label>
          <input id="filter-owner" type="text" value={filters.owner} onChange={updateFilter('owner')} placeholder="Owner name" />
        </div>
        <div className="form-field">
          <label htmlFor="filter-service">Impacted service</label>
          <input id="filter-service" type="text" value={filters.impactedService} onChange={updateFilter('impactedService')} placeholder="Service name" />
        </div>
        <div className="form-field">
          <label htmlFor="filter-sla">SLA status</label>
          <select id="filter-sla" value={filters.slaStatus} onChange={updateFilter('slaStatus')}>
            <option value="">All SLA states</option>
            {Object.entries(SLA_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter-sortBy">Sort by</label>
          <select id="filter-sortBy" value={filters.sortBy} onChange={updateFilter('sortBy')}>
            <option value="createdAt">Creation date</option>
            <option value="severity">Severity</option>
          </select>
        </div>
        <div className="form-field">
          <label htmlFor="filter-order">Order</label>
          <select id="filter-order" value={filters.order} onChange={updateFilter('order')}>
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
        <button type="button" className="btn btn-secondary" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      {status === 'loading' && (
        <>
          <p className="visually-hidden">Loading incidents…</p>
          <SkeletonRows columns={8} />
        </>
      )}
      {status === 'error' && <p className="server-error" role="alert">{errorMessage}</p>}
      {status === 'ready' && (
        <>
          <div className="result-bar">
            <p className="result-count">{incidents.length} incident{incidents.length === 1 ? '' : 's'} found</p>
          </div>
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
                    <th scope="col">Owner</th>
                    <th scope="col">Service</th>
                    <th scope="col">Created</th>
                    <th scope="col">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedIncidents.map((incident) => (
                    <tr key={incident.incidentId}>
                      <td>
                        <Link to={`/incidents/${incident.incidentId}`}>{incident.incidentId}</Link>
                      </td>
                      <td>{incident.title}</td>
                      <td><SeverityBadge severity={incident.severity} /></td>
                      <td><StatusBadge status={incident.status} /></td>
                      <td>{incident.owner || '—'}</td>
                      <td>{incident.impactedService}</td>
                      <td>{formatDateTime(incident.createdAt)}</td>
                      <td><SlaBadge status={incident.sla.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageCount > 1 && (
                <div className="pagination-bar">
                  <span className="pagination-status">
                    Page {page} of {pageCount}
                  </span>
                  <div className="pagination-controls">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                      disabled={page === pageCount}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
