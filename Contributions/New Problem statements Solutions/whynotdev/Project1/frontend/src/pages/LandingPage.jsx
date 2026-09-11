import { Link } from 'react-router-dom';

function LandingPage() {
  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <Link className="brand" to="/" aria-label="Incident Response home">
          <span className="brand-mark">IR</span>
          <span>Incident Response</span>
        </Link>
        <div className="nav-links">
          <a href="#workspace">Workspace</a>
          <a href="#workflow">Workflow</a>
          <Link className="nav-button" to="/dashboard">Dashboard</Link>
        </div>
      </nav>

      <section className="hero" id="workspace">
        <div className="hero-copy">
          <p className="eyebrow">Incident command center</p>
          <h1>Respond with <em>clarity.</em></h1>
          <p className="hero-text">Create and track incidents with a clear owner, severity, and impacted service from the first signal.</p>
          <div className="trust-line"><span className="pulse-dot" /> Live incident visibility for engineering teams</div>
        </div>
        <div className="dashboard-preview" aria-label="Dashboard preview">
          <div className="preview-header"><div><span className="preview-kicker">Operations / Today</span><h2>Response overview</h2></div><span className="live-badge">LIVE</span></div>
          <div className="metric-row"><div><strong>12</strong><span>Active incidents</span></div><div><strong className="warning-number">03</strong><span>Need attention</span></div><div><strong>94%</strong><span>Within SLA</span></div></div>
          <Link className="primary-button" to="/dashboard">Open dashboard</Link>
        </div>
      </section>

      <section className="workflow" id="workflow">
        <div className="section-heading"><p className="eyebrow">One shared operating picture</p><h2>From first signal to final learning.</h2></div>
        <div className="workflow-grid"><article><span className="step-number">01</span><h3>Coordinate</h3><p>Give every incident a clear owner, severity, and next action from the first minute.</p></article><article><span className="step-number">02</span><h3>Communicate</h3><p>Keep status, impact, and the timeline visible so the team moves as one.</p></article><article><span className="step-number">03</span><h3>Learn</h3><p>Turn resolution details into a structured RCA your future self can use.</p></article></div>
      </section>
      <footer><span>Incident Response Platform</span><span>Built for focused response.</span></footer>
    </main>
  );
}

export default LandingPage;