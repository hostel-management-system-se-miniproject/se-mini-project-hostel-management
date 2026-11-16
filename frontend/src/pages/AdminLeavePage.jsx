import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { decideLeave, fetchLeaves } from '../api/leaves';
import { formatLeaveDate, leaveStatusClass } from '../leaveFormat';
import '../complaints.css';
import '../leave.css';

const FILTER_STATUSES = ['Pending', 'Approved', 'Rejected'];

// One request. Approve and Reject appear only while it is Pending.
export function AdminLeaveCard({ leave, onDecide, busy = false, error = '' }) {
  const pending = leave.status === 'Pending';

  return (
    <article className="complaint-item">
      <div className="complaint-item-header">
        <div>
          <p className="eyebrow">Leave request</p>
          <h4>{leave.studentName ?? 'Unknown student'}</h4>
          <p className="complaint-student">{leave.usn ?? '—'}</p>
        </div>
        <span className={leaveStatusClass(leave.status)}>{leave.status}</span>
      </div>

      <p className="complaint-description">
        <strong>{formatLeaveDate(leave.startDate)} to {formatLeaveDate(leave.endDate)}.</strong> {leave.reason}
      </p>

      <div className="complaint-meta">
        <span>Requested {formatLeaveDate(String(leave.createdAt ?? '').slice(0, 10))}</span>
        {leave.decidedAt ? <span>Decided {formatLeaveDate(String(leave.decidedAt).slice(0, 10))}</span> : null}
      </div>

      {pending ? (
        <div className="leave-actions">
          <button type="button" className="primary-button" disabled={busy} onClick={() => onDecide(leave.id, 'Approved')}>
            Approve
          </button>
          <button type="button" disabled={busy} onClick={() => onDecide(leave.id, 'Rejected')}>
            Reject
          </button>
          {error ? <p className="leave-actions-error" role="alert">{error}</p> : null}
        </div>
      ) : null}
    </article>
  );
}

AdminLeaveCard.propTypes = {
  leave: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    reason: PropTypes.string,
    usn: PropTypes.string,
    studentName: PropTypes.string,
    createdAt: PropTypes.string,
    decidedAt: PropTypes.string,
  }).isRequired,
  onDecide: PropTypes.func.isRequired,
  busy: PropTypes.bool,
  error: PropTypes.string,
};

export function AdminLeaveList({ leaves, filtered, onDecide, busyId = '', errors = {} }) {
  if (leaves.length === 0) {
    return (
      <p className="inline-note" role="status">
        {filtered ? 'No leave requests match this filter.' : 'No leave requests have been submitted yet.'}
      </p>
    );
  }

  return (
    <div className="complaint-list">
      {leaves.map((leave) => (
        <AdminLeaveCard
          key={leave.id}
          leave={leave}
          onDecide={onDecide}
          busy={busyId === leave.id}
          error={errors[leave.id] ?? ''}
        />
      ))}
    </div>
  );
}

AdminLeaveList.propTypes = {
  leaves: PropTypes.arrayOf(PropTypes.object).isRequired,
  filtered: PropTypes.bool.isRequired,
  onDecide: PropTypes.func.isRequired,
  busyId: PropTypes.string,
  errors: PropTypes.objectOf(PropTypes.string),
};

export function AdminLeavePage() {
  const [status, setStatus] = React.useState('');
  // Bumping "version" reloads the list after a decision.
  const [request, setRequest] = React.useState({ status: '', version: 0 });
  const [result, setResult] = React.useState({ for: null, leaves: [], error: '' });
  const [busyId, setBusyId] = React.useState('');
  const [errors, setErrors] = React.useState({});
  const [notice, setNotice] = React.useState('');

  React.useEffect(() => {
    const controller = new AbortController();
    fetchLeaves({ status: request.status }, { signal: controller.signal })
      .then((leaves) => setResult({ for: request, leaves, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ for: request, leaves: [], error: error.message });
        }
      });
    return () => controller.abort();
  }, [request]);

  const loading = result.for !== request;

  const handleFilter = (event) => {
    const next = event.target.value;
    setStatus(next);
    setNotice('');
    setErrors({});
    setRequest((current) => ({ status: next, version: current.version }));
  };

  const handleDecide = async (id, decision) => {
    setBusyId(id);
    setNotice('');
    setErrors((current) => ({ ...current, [id]: '' }));
    try {
      await decideLeave(id, decision);
      setNotice(`Leave request ${decision.toLowerCase()}.`);
    } catch (caught) {
      setErrors((current) => ({ ...current, [id]: caught.message }));
    } finally {
      setBusyId('');
      // Always reload, so a request someone else already decided shows its real status.
      setRequest((current) => ({ status: current.status, version: current.version + 1 }));
    }
  };

  return (
    <div className="complaint-page">
      <div className="widget-card">
        <h3>Leave requests</h3>

        <div className="complaint-filters">
          <label>
            <span>Status</span>
            <select value={status} onChange={handleFilter}>
              <option value="">All</option>
              {FILTER_STATUSES.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        {notice ? <Alert variant="success" title="Saved" message={notice} /> : null}
        {!loading && result.error ? <Alert variant="error" title="Could not load leave requests" message={result.error} /> : null}
        {loading ? <LoadingState label="Loading leave requests …" /> : null}
        {!loading && !result.error ? (
          <AdminLeaveList
            leaves={result.leaves}
            filtered={Boolean(request.status)}
            onDecide={handleDecide}
            busyId={busyId}
            errors={errors}
          />
        ) : null}
      </div>
    </div>
  );
}

export default AdminLeavePage;
