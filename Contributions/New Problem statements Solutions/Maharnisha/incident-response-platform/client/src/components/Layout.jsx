import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IconDashboard, IconIncidents, IconCreate, IconRca, IconSla, IconSearch, IconBell, IconMenu, IconClose } from './icons.jsx';

const NAV_LINKS = [
  { to: '/', label: 'Home', icon: IconDashboard, end: true },
  { to: '/dashboard', label: 'Dashboard', icon: IconDashboard },
  { to: '/incidents', label: 'Incidents', icon: IconIncidents },
  { to: '/incidents/new', label: 'Create Incident', icon: IconCreate },
  { to: '/incidents', label: 'RCA Reports', icon: IconRca, hint: 'Open an incident to view its RCA' },
  { to: '/dashboard', label: 'SLA Monitoring', icon: IconSla, hint: 'SLA breakdown on the dashboard' }
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const query = event.target.elements.globalSearch.value.trim();
    navigate(query ? `/incidents?search=${encodeURIComponent(query)}` : '/incidents');
    setSidebarOpen(false);
  };

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <aside className="app-sidebar" aria-label="Primary navigation">
        <div className="app-sidebar-brand">
          <span className="app-sidebar-logo" aria-hidden="true">IR</span>
          <span className="app-sidebar-title">Incident Response</span>
        </div>
        <nav aria-label="Main navigation">
          <ul className="nav-list">
            {NAV_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <li key={link.label}>
                  <NavLink
                    to={link.to}
                    end={link.end ?? link.to === '/incidents'}
                    className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                    title={link.hint}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon />
                    <span>{link.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="app-sidebar-footer">
          <p>Demo data only.</p>
        </div>
      </aside>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <div className="app-content">
        <header className="app-header">
          <div className="app-header-inner">
            <button
              type="button"
              className="icon-button sidebar-toggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
              aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={sidebarOpen}
            >
              {sidebarOpen ? <IconClose /> : <IconMenu />}
            </button>
            <span className="app-title">Incident Response Platform</span>

            <form className="header-search" role="search" onSubmit={handleSearchSubmit}>
              <IconSearch className="header-search-icon" />
              <label htmlFor="globalSearch" className="visually-hidden">
                Search incidents
              </label>
              <input id="globalSearch" name="globalSearch" type="search" placeholder="Search incidents…" />
            </form>

            <div className="header-actions">
              <button type="button" className="icon-button" aria-label="Notifications">
                <IconBell />
              </button>
              <div className="user-avatar" title="Signed in as On-Call Responder" aria-hidden="true">
                OC
              </div>
            </div>
          </div>
        </header>
        <main id="main-content" className="app-main">
          <Outlet />
        </main>
        <footer className="app-footer">
          <p>Incident Response Platform — fictional demo data only.</p>
        </footer>
      </div>
    </div>
  );
}
