import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import LandingPage from './pages/LandingPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import IncidentListPage from './pages/IncidentListPage.jsx';
import CreateIncidentPage from './pages/CreateIncidentPage.jsx';
import IncidentDetailPage from './pages/IncidentDetailPage.jsx';
import RcaPage from './pages/RcaPage.jsx';

function NotFoundPage() {
  return (
    <section className="empty-state">
      <p className="empty-state-title">Page Not Found</p>
      <p className="empty-state-description">The page you requested does not exist.</p>
    </section>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/incidents" element={<IncidentListPage />} />
        <Route path="/incidents/new" element={<CreateIncidentPage />} />
        <Route path="/incidents/:incidentId" element={<IncidentDetailPage />} />
        <Route path="/incidents/:incidentId/rca" element={<RcaPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
