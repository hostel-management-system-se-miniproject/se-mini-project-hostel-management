import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { PlaceholderPage } from '../components/PlaceholderPage';
import { fetchMyLeaves, submitLeave } from '../api/leaves';
import { formatLeaveDate, leaveStatusClass, validateLeave } from '../leaveFormat';
import '../complaints.css';
import '../leave.css';

const EMPTY_FORM = { startDate: '', endDate: '', reason: '' };

export function LeaveList({ leaves }) {
  if (!leaves || leaves.length === 0) {
    return <p className="inline-note">No leave requests yet. Submit the first one above.</p>;
  }

  return (
    <div className="complaint-list">
      {leaves.map((leave) => (
        <article key={leave.id} className="complaint-item">
          <div className="complaint-item-header">
            <div>
              <p className="eyebrow">Leave request</p>
              <h4>{formatLeaveDate(leave.startDate)} to {formatLeaveDate(leave.endDate)}</h4>
            </div>
            <span className={leaveStatusClass(leave.status)}>{leave.status}</span>
          </div>

          <p className="complaint-description">{leave.reason}</p>

          <div className="complaint-meta">
            <span>Requested {formatLeaveDate(String(leave.createdAt ?? '').slice(0, 10))}</span>
            {leave.decidedAt ? <span>Decided {formatLeaveDate(String(leave.decidedAt).slice(0, 10))}</span> : null}
          </div>
        </article>
      ))}
    </div>
  );
}

LeaveList.propTypes = {
  leaves: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    startDate: PropTypes.string,
    endDate: PropTypes.string,
    reason: PropTypes.string,
    status: PropTypes.string.isRequired,
    createdAt: PropTypes.string,
    decidedAt: PropTypes.string,
  })).isRequired,
};

export function LeavePage({ role = 'student' }) {
  const [form, setForm] = React.useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [leaves, setLeaves] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadError, setLoadError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  React.useEffect(() => {
    if (role !== 'student') {
      return undefined;
    }

    let isMounted = true;
    const load = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const next = await fetchMyLeaves();
        if (isMounted) setLeaves(next);
      } catch (caught) {
        if (isMounted) setLoadError(caught.message || 'Could not load leave requests.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void load();
    return () => {
      isMounted = false;
    };
  }, [role]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;

    const errors = validateLeave(form);
    setFieldErrors(errors);
    setSuccess('');
    if (Object.keys(errors).length > 0) {
      setError('');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await submitLeave({ startDate: form.startDate, endDate: form.endDate, reason: form.reason.trim() });
      setSuccess('Leave request submitted. It is Pending until the hostel office decides.');
      setForm(EMPTY_FORM);
      try {
        setLeaves(await fetchMyLeaves());
        setLoadError('');
      } catch (caught) {
        setLoadError(caught.message || 'Could not refresh your leave requests.');
      }
    } catch (caught) {
      setError(caught.message || 'Could not submit your leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (role !== 'student') {
    return (
      <PlaceholderPage
        title="Leave"
        description="Leave approval for the hostel office will live here."
      />
    );
  }

  return (
    <div className="complaint-page">
      <div className="widget-card">
        <h3>Request leave</h3>

        <form className="complaint-form" onSubmit={handleSubmit} noValidate>
          <div className="complaint-form-grid">
            <div className="leave-date-row">
              <label>
                <span>Start date</span>
                <input type="date" name="startDate" value={form.startDate} onChange={handleChange} />
                {fieldErrors.startDate ? <p className="leave-field-error">{fieldErrors.startDate}</p> : null}
              </label>

              <label>
                <span>End date</span>
                <input type="date" name="endDate" value={form.endDate} onChange={handleChange} />
                {fieldErrors.endDate ? <p className="leave-field-error">{fieldErrors.endDate}</p> : null}
              </label>
            </div>

            <label className="full-width">
              <span>Reason</span>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                placeholder="Why do you need leave?"
                rows="4"
              />
              {fieldErrors.reason ? <p className="leave-field-error">{fieldErrors.reason}</p> : null}
            </label>
          </div>

          {error ? <Alert variant="error" title="Could not submit leave request" message={error} /> : null}
          {success ? <Alert variant="success" title="Leave request submitted" message={success} /> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      </div>

      <div className="widget-card">
        <h3>Your leave requests</h3>
        {loadError ? <Alert variant="error" title="Could not load leave requests" message={loadError} /> : null}
        {loading ? <LoadingState label="Loading leave requests …" /> : <LeaveList leaves={leaves} />}
      </div>
    </div>
  );
}

LeavePage.propTypes = {
  role: PropTypes.oneOf(['student', 'admin']),
};

export default LeavePage;
