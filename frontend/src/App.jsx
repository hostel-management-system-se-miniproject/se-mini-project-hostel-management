import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { downloadReport } from '../api/reports';

const EXPORT_OPTIONS = [
  { label: 'Student CSV', type: 'student', format: 'csv' },
  { label: 'Student PDF', type: 'student', format: 'pdf' },
  { label: 'Fee CSV', type: 'fee', format: 'csv' },
  { label: 'Fee PDF', type: 'fee', format: 'pdf' },
  { label: 'Complaint CSV', type: 'complaint', format: 'csv' },
  { label: 'Complaint PDF', type: 'complaint', format: 'pdf' },
];

export function ReportsPage({ role = 'admin' }) {
  const [status, setStatus] = React.useState({ kind: '', message: '' });
  const [busy, setBusy] = React.useState(null);

  const handleExport = async (type, format) => {
    setBusy(`${type}:${format}`);
    setStatus({ kind: '', message: '' });

    try {
      await downloadReport(type, format);
      setStatus({ kind: 'success', message: `${type} ${format.toUpperCase()} export started.` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message || 'The export could not be created.' });
    } finally {
      setBusy(null);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="widget-card">
        <h3>Reports</h3>
        <p className="inline-note">Only admins can export hostel reports.</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <h3>Export reports</h3>
      <p className="inline-note">Download the current hostel records as CSV or PDF.</p>

      {status.message ? (
        <Alert
          variant={status.kind === 'success' ? 'success' : 'error'}
          title={status.kind === 'success' ? 'Export ready' : 'Export failed'}
          message={status.message}
        />
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginTop: '18px' }}>
        {EXPORT_OPTIONS.map((option) => (
          <button
            key={`${option.type}-${option.format}`}
            type="button"
            onClick={() => handleExport(option.type, option.format)}
            disabled={busy !== null}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #d0d7de',
              background: busy === `${option.type}:${option.format}` ? '#f0f4f8' : '#ffffff',
              cursor: busy !== null ? 'wait' : 'pointer',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {busy === `${option.type}:${option.format}` ? 'Preparing…' : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

ReportsPage.propTypes = {
  role: PropTypes.oneOf(['student', 'admin'])
};

export default ReportsPage;

""" ,{"path":"frontend/src/pages/ReportsPage.jsx"} ]
