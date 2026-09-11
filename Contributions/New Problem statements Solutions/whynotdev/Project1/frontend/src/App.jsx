import { BrowserRouter, Route, Routes } from 'react-router-dom';
import BackNavigationButton from './components/BackNavigationButton.jsx';
import CreateIncidentPage from './pages/CreateIncidentPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import IncidentDetailPage from './pages/IncidentDetailPage.jsx';
import IncidentRegisterPage from './pages/IncidentRegisterPage.jsx';
import LandingPage from './pages/LandingPage.jsx';
import RootCauseAnalysisPage from './pages/RootCauseAnalysisPage.jsx';
import RootCauseAnalysisRegisterPage from './pages/RootCauseAnalysisRegisterPage.jsx';
import RelatedIncidentsPage from './pages/RelatedIncidentsPage.jsx';

function App() {
  return (
    <BrowserRouter>
      <BackNavigationButton />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dashboard/incidents/new" element={<CreateIncidentPage />} />
        <Route path="/dashboard/incidents" element={<IncidentRegisterPage />} />
        <Route path="/dashboard/incidents/:incidentId" element={<IncidentDetailPage />} />
        <Route path="/dashboard/incidents/:incidentId/rca" element={<RootCauseAnalysisPage />} />
        <Route path="/dashboard/rcas" element={<RootCauseAnalysisRegisterPage />} />
        <Route path="/dashboard/related-incidents" element={<RelatedIncidentsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
