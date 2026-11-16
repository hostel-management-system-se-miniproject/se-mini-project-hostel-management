import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { fetchMyComplaints, submitComplaint } from '../api/complaints';
import { AdminComplaintsPage } from './AdminComplaintsPage';
import { formatDateTime } from '../complaintFormat';
import '../complaints.css';

const CATEGORY_OPTIONS = [
  'Electrical',
  'Plumbing',
  'Furniture',
];

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function ComplaintList({ complaints }) {
  if (!complaints || complaints.length === 0) {
    return <p className="inline-note">No complaints yet. Submit the first one above.</p>;
  }

  return (
    <div className="complaint-list">
      {complaints.map((complaint) => (
        <article key={complaint.id} className="complaint-item">
          <div className="complaint-item-header">
            <div>
              <p className="eyebrow">{complaint.category}</p>
              <h4>{complaint.status}</h4>
            </div>
            <span className={`complaint-status complaint-status-${complaint.status.toLowerCase().replace(/\s+/g, '-')}`}>
              {complaint.status}
            </span>
          </div>

          <p className="complaint-description">{complaint.description}</p>

          {complaint.remarks ? (
            <p className="complaint-remarks"><strong>Remarks:</strong> {complaint.remarks}</p>
          ) : null}

          <div className="complaint-meta">
            <span>Filed {formatDate(complaint.createdAt)}</span>
            {complaint.updatedAt && complaint.updatedAt !== complaint.createdAt ? (
              <span>Updated {formatDate(complaint.updatedAt)}</span>
            ) : null}
          </div>

          {complaint.history && complaint.history.length > 0 ? (
            <ol className="complaint-history" aria-label="Status history">
              {complaint.history.map((entry, index) => (
                <li key={`${entry.status}-${entry.at}-${index}`}>
                  <strong>{entry.status}</strong>
                  <span>{formatDateTime(entry.at)}</span>
                  {entry.remarks ? <span>{entry.remarks}</span> : null}
                </li>
              ))}
            </ol>
          ) : null}
        </article>
      ))}
    </div>
  );
}

ComplaintList.propTypes = {
  complaints: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    remarks: PropTypes.string,
    createdAt: PropTypes.string,
    updatedAt: PropTypes.string,
    history: PropTypes.arrayOf(PropTypes.shape({
      status: PropTypes.string.isRequired,
      remarks: PropTypes.string,
      at: PropTypes.string,
    })),
  })).isRequired,
};

export function ComplaintError({ title, message }) {
  if (!message) return null;

  return <Alert variant="error" title={title} message={message} />;
}

ComplaintError.propTypes = {
  title: PropTypes.string.isRequired,
  message: PropTypes.string,
};

export function ComplaintsPage({ role = 'student' }) {
  const [form, setForm] = React.useState({ category: CATEGORY_OPTIONS[0], description: '' });
  const [complaints, setComplaints] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [loadError, setLoadError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const loadComplaints = React.useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const nextComplaints = await fetchMyComplaints();
      setComplaints(nextComplaints);
    } catch (caught) {
      setLoadError(caught.message || 'Could not load complaints.');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (role !== 'student') {
      return undefined;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const nextComplaints = await fetchMyComplaints();
        if (isMounted) {
          setComplaints(nextComplaints);
        }
      } catch (caught) {
        if (isMounted) {
          setLoadError(caught.message || 'Could not load complaints.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
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

    const description = form.description.trim();
    if (!description) {
      setError('Description is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await submitComplaint({ category: form.category, description });
      setSuccess('Complaint submitted successfully.');
      setForm((previous) => ({ ...previous, description: '' }));
      await loadComplaints();
    } catch (caught) {
      setError(caught.message || 'Could not submit your complaint.');
    } finally {
      setSubmitting(false);
    }
  };

  if (role !== 'student') {
    return <AdminComplaintsPage />;
  }

  return (
    <div className="complaint-page">
      <div className="widget-card">
        <h3>Raise a complaint</h3>

        <form className="complaint-form" onSubmit={handleSubmit} noValidate>
          <div className="complaint-form-grid">
            <label>
              <span>Category</span>
              <select name="category" value={form.category} onChange={handleChange}>
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>

            <label className="full-width">
              <span>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the issue you need help with"
                rows="6"
              />
            </label>
          </div>

          <ComplaintError title="Could not submit complaint" message={error} />
          {success ? <Alert variant="success" title="Complaint submitted" message={success} /> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit complaint'}
          </button>
        </form>
      </div>

      <div className="widget-card">
        <h3>Your complaints</h3>
        <ComplaintError title="Could not load complaints" message={loadError} />
        {loading ? <LoadingState label="Loading complaints …" /> : <ComplaintList complaints={complaints} />}
      </div>
    </div>
  );
}

ComplaintsPage.propTypes = {
  role: PropTypes.oneOf(['student', 'admin']),
};

export default ComplaintsPage;
