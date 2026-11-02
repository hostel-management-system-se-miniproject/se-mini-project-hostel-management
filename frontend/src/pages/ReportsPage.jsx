import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { downloadReport } from '../api/reports';
import '../reports.css';

export const EXPORT_OPTIONS = [
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
      setStatus({
        kind: 'success',
        message: `The ${type} ${format.toUpperCase()} report was downloaded.`,
      });
    } catch (error) {
      setStatus({
        kind: 'error',
        message: error.message || 'The export could not be created.',
      });
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
    <div className="widget-card reports-card">
      <h3>Export reports</h3>
      <p className="inline-note">Download the current hostel records as CSV or PDF.</p>

      {status.message ? (
        <Alert
          variant={status.kind === 'success' ? 'success' : 'error'}
          title={status.kind === 'success' ? 'Export ready' : 'Export failed'}
          message={status.message}
        />
      ) : null}

      <div className="reports-grid">
        {EXPORT_OPTIONS.map((option) => {
          const key = `${option.type}:${option.format}`;
          return (
            <button
              key={key}
              type="button"
              className="report-button"
              onClick={() => handleExport(option.type, option.format)}
              disabled={busy !== null}
            >
              {busy === key ? 'Preparing …' : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

ReportsPage.propTypes = {
  role: PropTypes.oneOf(['student', 'admin']),
};

export default ReportsPage;
