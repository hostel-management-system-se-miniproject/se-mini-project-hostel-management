import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

function App() {
  const [apiStatus, setApiStatus] = React.useState('checking');
  const [databaseStatus, setDatabaseStatus] = React.useState('unknown');

  React.useEffect(() => {
    let active = true;

    fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/health`)
      .then(async (response) => {
        const data = await response.json();
        if (!active) return;
        setApiStatus(response.ok ? 'online' : 'unavailable');
        setDatabaseStatus(data.database || 'unknown');
      })
      .catch(() => {
        if (!active) return;
        setApiStatus('unreachable');
        setDatabaseStatus('unknown');
      });

    return () => { active = false; };
  }, []);

  return (
    <main className="page">
      <section className="panel" aria-labelledby="page-title">
        <div className="mark" aria-hidden="true">HMS</div>
        <p className="eyebrow">HOSTEL MANAGEMENT SYSTEM</p>
        <h1 id="page-title">Application scaffold</h1>
        <p className="intro">The React frontend is running. This page checks the Express API and its database connection.</p>
        <div className="status-list" aria-live="polite">
          <div className="status-row"><span>Frontend</span><strong className="online">Running</strong></div>
          <div className="status-row"><span>REST API</span><strong className={apiStatus === 'online' ? 'online' : 'pending'}>{apiStatus}</strong></div>
          <div className="status-row"><span>MongoDB</span><strong className={databaseStatus === 'connected' ? 'online' : 'pending'}>{databaseStatus}</strong></div>
        </div>
        <p className="footnote">HMS-01 · Foundation scaffold</p>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
