import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { fetchComplaints, updateComplaint } from '../api/complaints';
import {
  ADMIN_STATUSES,
  COMPLAINT_CATEGORIES,
  FILTER_STATUSES,
  formatDateTime,
  statusClass,
  validateStatusUpdate,
} from '../complaintFormat';
import '../complaints.css';

const NO_FILTERS = { status: '', category: '' };

export function ComplaintUpdateForm({ complaint, onUpdated }) {
  const [status, setStatus] = React.useState(ADMIN_STATUSES.includes(complaint.status) ? complaint.status : ADMIN_STATUSES[0]);
  const [remarks, setRemarks] = React.useState('');
  const [error, setError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const problems = validateStatusUpdate({ status, remarks });
    if (Object.keys(problems).length > 0) {
      setError(problems.status || problems.remarks);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const updated = await updateComplaint(complaint.id, { status, remarks: remarks.trim() });
      setRemarks('');
      onUpdated(updated);
    } catch (caught) {
      setError(caught.message || 'Could not update the complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="complaint-update" onSubmit={handleSubmit} noValidate aria-label={`Update complaint ${complaint.id}`}>
      <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="New status">
        {ADMIN_STATUSES.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
      <input
        type="text"
        value={remarks}
        placeholder="Remarks (required)"
        onChange={(event) => { setRemarks(event.target.value); setError(''); }}
        aria-label="Remarks"
        aria-invalid={error ? 'true' : 'false'}
      />
      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? 'Saving …' : 'Update'}
      </button>
      {error ? <p className="complaint-update-error" role="alert">{error}</p> : null}
    </form>
  );
}

ComplaintUpdateForm.propTypes = {
  complaint: PropTypes.shape({ id: PropTypes.string.isRequired, status: PropTypes.string.isRequired }).isRequired,
  onUpdated: PropTypes.func.isRequired,
};

export function AdminComplaintCard({ complaint, onUpdated }) {
  return (
    <article className="complaint-item">
      <div className="complaint-item-header">
        <div>
          <p className="eyebrow">{complaint.category}</p>
          <h4>{complaint.studentName ?? 'Unknown student'}</h4>
          <p className="complaint-student">{complaint.usn ?? '—'}</p>
        </div>
        <span className={statusClass(complaint.status)}>{complaint.status}</span>
      </div>

      <p className="complaint-description">{complaint.description}</p>
      {complaint.remarks ? <p className="complaint-remarks"><strong>Remarks:</strong> {complaint.remarks}</p> : null}

      <div className="complaint-meta">
        <span>Filed {formatDateTime(complaint.createdAt)}</span>
        {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt ? (
          <span>Updated {formatDateTime(complaint.updatedAt)}</span>
        ) : null}
      </div>

      <ComplaintUpdateForm complaint={complaint} onUpdated={onUpdated} />
    </article>
  );
}

AdminComplaintCard.propTypes = {
  complaint: PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    remarks: PropTypes.string,
    usn: PropTypes.string,
    studentName: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
  }).isRequired,
  onUpdated: PropTypes.func.isRequired,
};

export function AdminComplaintList({ complaints, filtered, onUpdated }) {
  if (complaints.length === 0) {
    return (
      <p className="inline-note" role="status">
        {filtered ? 'No complaints match these filters.' : 'No complaints have been submitted yet.'}
      </p>
    );
  }

  return (
    <div className="complaint-list">
      {complaints.map((complaint) => (
        <AdminComplaintCard key={complaint.id} complaint={complaint} onUpdated={onUpdated} />
      ))}
    </div>
  );
}

AdminComplaintList.propTypes = {
  complaints: PropTypes.arrayOf(PropTypes.object).isRequired,
  filtered: PropTypes.bool.isRequired,
  onUpdated: PropTypes.func.isRequired,
};

export function AdminComplaintsPage() {
  const [filters, setFilters] = React.useState(NO_FILTERS);
  // Bumping "version" reloads the list after an update.
  const [request, setRequest] = React.useState({ filters: NO_FILTERS, version: 0 });
  const [result, setResult] = React.useState({ for: null, complaints: [], error: '' });
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => {
    const controller = new AbortController();
    fetchComplaints(request.filters, { signal: controller.signal })
      .then((complaints) => setResult({ for: request, complaints, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ for: request, complaints: [], error: error.message });
        }
      });
    return () => controller.abort();
  }, [request]);

  const loading = result.for !== request;

  const handleFilterChange = (field) => (event) => {
    const next = { ...filters, [field]: event.target.value };
    setFilters(next);
    setNotice('');
    setRequest((current) => ({ filters: next, version: current.version }));
  };

  const handleUpdated = (updated) => {
    setNotice(`Complaint updated to ${updated.status}.`);
    setRequest((current) => ({ filters: current.filters, version: current.version + 1 }));
  };

  const filtered = Boolean(request.filters.status || request.filters.category);

  return (
    <div className="complaint-page">
      <div className="widget-card">
        <h3>Complaints</h3>

        <div className="complaint-filters">
          <label>
            <span>Status</span>
            <select value={filters.status} onChange={handleFilterChange('status')}>
              <option value="">All</option>
              {FILTER_STATUSES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={filters.category} onChange={handleFilterChange('category')}>
              <option value="">All</option>
              {COMPLAINT_CATEGORIES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        {notice ? <Alert variant="success" title="Saved" message={notice} /> : null}
        {!loading && result.error ? <Alert variant="error" title="Could not load complaints" message={result.error} /> : null}
        {loading ? <LoadingState label="Loading complaints …" /> : null}
        {!loading && !result.error ? (
          <AdminComplaintList complaints={result.complaints} filtered={filtered} onUpdated={handleUpdated} />
        ) : null}
      </div>
    </div>
  );
}

export default AdminComplaintsPage;
