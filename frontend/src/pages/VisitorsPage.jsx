import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { createVisitor, fetchVisitors, recordVisitorExit } from '../api/visitors';

const noop = () => {};

function currentLocalInputValue() {
  return toLocalInputValue(new Date());
}

function emptyEntry() {
  return {
    usn: '',
    name: '',
    contact: '',
    purpose: '',
    entryTime: currentLocalInputValue(),
  };
}

export function toIsoFromLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

export function toLocalInputValue(date) {
  const value = new Date(date);
  const pad = (part) => String(part).padStart(2, '0');
  return [
    `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  ].join('T');
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function applyExitResult(visitors, updated) {
  return visitors.map((visitor) => (
    visitor.id === updated.id ? { ...visitor, ...updated } : visitor
  ));
}

export function VisitorForm({
  values = emptyEntry(),
  fieldErrors = {},
  submitting = false,
  onChange = noop,
  onSubmit = noop,
}) {
  const fields = [
    { name: 'usn', label: 'Student USN', type: 'text' },
    { name: 'name', label: 'Visitor name', type: 'text' },
    { name: 'contact', label: 'Contact number', type: 'tel', inputMode: 'numeric' },
    { name: 'purpose', label: 'Purpose', type: 'text' },
    { name: 'entryTime', label: 'Entry time', type: 'datetime-local' },
  ];

  return (
    <form className="visitor-form" onSubmit={onSubmit}>
      <div className="visitor-form-grid">
        {fields.map((field) => {
          const error = fieldErrors[field.name];
          const errorId = `${field.name}-error`;
          return (
            <label className={field.name === 'purpose' ? 'visitor-field visitor-field-wide' : 'visitor-field'} key={field.name}>
              <span>{field.label}</span>
              <input
                type={field.type}
                inputMode={field.inputMode}
                name={field.name}
                value={values[field.name] ?? ''}
                onChange={onChange}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
              {error ? <span className="visitor-field-error" id={errorId}>{error}</span> : null}
            </label>
          );
        })}
      </div>
      <button type="submit" className="primary-button" disabled={submitting}>
        {submitting ? 'Saving…' : 'Save visitor entry'}
      </button>
    </form>
  );
}

VisitorForm.propTypes = {
  values: PropTypes.shape({
    usn: PropTypes.string,
    name: PropTypes.string,
    contact: PropTypes.string,
    purpose: PropTypes.string,
    entryTime: PropTypes.string,
  }),
  fieldErrors: PropTypes.objectOf(PropTypes.string),
  submitting: PropTypes.bool,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
};

export function VisitorTable({
  visitors,
  onRecordExit = noop,
  exitSubmittingId = null,
  exitErrors = {},
}) {
  const [editingId, setEditingId] = React.useState(null);
  const [exitTimes, setExitTimes] = React.useState({});

  const openExit = (id) => {
    setEditingId(id);
    setExitTimes((current) => ({ ...current, [id]: current[id] || currentLocalInputValue() }));
  };

  const cancelExit = () => setEditingId(null);

  const saveExit = (event, visitor) => {
    event.preventDefault();
    onRecordExit(visitor, exitTimes[visitor.id] || '');
  };

  if (visitors.length === 0) {
    return <p className="empty-state visitor-empty-state">No visitors have been logged yet</p>;
  }

  return (
    <div className="table-wrap">
      <table className="visitor-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Visitor</th>
            <th>Contact</th>
            <th>Purpose</th>
            <th>Entry</th>
            <th>Exit</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((visitor) => (
            <React.Fragment key={visitor.id}>
              <tr>
                <td>
                  <strong>{visitor.usn}</strong>
                  <span className="visitor-student-name">{visitor.studentName || '—'}</span>
                </td>
                <td>{visitor.name}</td>
                <td>{visitor.contact}</td>
                <td>{visitor.purpose}</td>
                <td>{formatDateTime(visitor.entryTime)}</td>
                <td>
                  {visitor.exitTime ? (
                    formatDateTime(visitor.exitTime)
                  ) : (
                    <>
                      <span className="visitor-inside-label">Inside</span>
                      <button type="button" className="visitor-action-button" onClick={() => openExit(visitor.id)}>
                        Record exit
                      </button>
                    </>
                  )}
                </td>
              </tr>
              {editingId === visitor.id && !visitor.exitTime ? (
                <tr className="visitor-exit-row">
                  <td colSpan="6">
                    <form onSubmit={(event) => saveExit(event, visitor)}>
                      <label>
                        Exit time
                        <input
                          type="datetime-local"
                          value={exitTimes[visitor.id] || ''}
                          onChange={(event) => setExitTimes((current) => ({
                            ...current,
                            [visitor.id]: event.target.value,
                          }))}
                          aria-describedby={exitErrors[visitor.id] ? `exit-${visitor.id}-error` : undefined}
                          aria-invalid={Boolean(exitErrors[visitor.id])}
                        />
                      </label>
                      <button type="submit" className="primary-button" disabled={exitSubmittingId === visitor.id}>
                        {exitSubmittingId === visitor.id ? 'Saving…' : 'Save'}
                      </button>
                      <button type="button" className="visitor-cancel-button" onClick={cancelExit}>Cancel</button>
                      {exitErrors[visitor.id] ? (
                        <span className="visitor-field-error" id={`exit-${visitor.id}-error`}>
                          {exitErrors[visitor.id]}
                        </span>
                      ) : null}
                    </form>
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

VisitorTable.propTypes = {
  visitors: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    usn: PropTypes.string,
    studentName: PropTypes.string,
    name: PropTypes.string,
    contact: PropTypes.string,
    purpose: PropTypes.string,
    entryTime: PropTypes.string,
    exitTime: PropTypes.string,
  })).isRequired,
  onRecordExit: PropTypes.func,
  exitSubmittingId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  exitErrors: PropTypes.objectOf(PropTypes.string),
};

export function VisitorsPage() {
  const [visitors, setVisitors] = React.useState([]);
  const [entry, setEntry] = React.useState(emptyEntry);
  const [fieldErrors, setFieldErrors] = React.useState({});
  const [error, setError] = React.useState('');
  const [loadError, setLoadError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [exitSubmittingId, setExitSubmittingId] = React.useState(null);
  const [exitErrors, setExitErrors] = React.useState({});
  const mounted = React.useRef(false);
  const requestId = React.useRef(0);
  const activeController = React.useRef(null);

  const loadVisitors = React.useCallback(async () => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setLoading(true);
    setLoadError('');

    try {
      const data = await fetchVisitors({ signal: controller.signal });
      if (!mounted.current || currentRequestId !== requestId.current) return;
      setVisitors(data);
      setLoadFailed(false);
    } catch (loadError) {
      if (
        !mounted.current
        || currentRequestId !== requestId.current
        || loadError?.name === 'AbortError'
      ) return;
      setLoadError(loadError.message);
      setLoadFailed(true);
    } finally {
      if (mounted.current && currentRequestId === requestId.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    loadVisitors();
    return () => {
      mounted.current = false;
      activeController.current?.abort();
    };
  }, [loadVisitors]);

  const handleEntryChange = (event) => {
    const { name, value } = event.target;
    setEntry((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    setFieldErrors({});
    try {
      await createVisitor({
        ...entry,
        entryTime: toIsoFromLocalInput(entry.entryTime),
      });
      if (!mounted.current) return;
      setSuccess('Visitor entry saved');
      setEntry(emptyEntry());
      await loadVisitors();
    } catch (submitError) {
      if (!mounted.current) return;
      setError(submitError.message);
      setFieldErrors(submitError.fieldErrors || {});
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  };

  const handleRecordExit = async (visitor, localExitTime) => {
    if (exitSubmittingId !== null) return;
    const isoExitTime = toIsoFromLocalInput(localExitTime);
    if (!isoExitTime) {
      setExitErrors((current) => ({ ...current, [visitor.id]: 'Enter an exit time' }));
      return;
    }
    setExitSubmittingId(visitor.id);
    setExitErrors((current) => ({ ...current, [visitor.id]: undefined }));
    try {
      const updated = await recordVisitorExit(visitor.id, isoExitTime);
      if (!mounted.current) return;
      setVisitors((current) => applyExitResult(current, updated));
    } catch (exitError) {
      if (!mounted.current) return;
      setExitErrors((current) => ({ ...current, [visitor.id]: exitError.message }));
    } finally {
      if (mounted.current) setExitSubmittingId(null);
    }
  };

  return (
    <div className="widget-card visitor-page">
      <h3>Visitor log</h3>
      {success ? <Alert variant="success" title="Success" message={success} /> : null}
      {error ? <Alert variant="error" title="Could not save visitor entry" message={error} /> : null}
      <VisitorForm
        values={entry}
        fieldErrors={fieldErrors}
        submitting={submitting}
        onChange={handleEntryChange}
        onSubmit={handleSubmit}
      />
      <div className="visitor-list">
        <h3>Recent visitors</h3>
        {loading ? <LoadingState label="Loading visitors …" /> : (
          <>
            {loadError ? <Alert variant="error" title="Could not load visitors" message={loadError} /> : null}
            {loadFailed ? (
              <button type="button" className="visitor-retry-button" onClick={loadVisitors}>Try again</button>
            ) : null}
            <VisitorTable
              visitors={visitors}
              onRecordExit={handleRecordExit}
              exitSubmittingId={exitSubmittingId}
              exitErrors={exitErrors}
            />
          </>
        )}
      </div>
    </div>
  );
}
