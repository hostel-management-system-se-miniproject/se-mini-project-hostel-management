
import React from 'react';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import '../fees.css';
import {
  createFee,
  fetchFees,
  fetchStudents,
  recordFeePayment
} from '../api/fees';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(Number(value) || 0);
}

function displayDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function FeesPage() {
  const [fees, setFees] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [status, setStatus] = React.useState('');
  const [studentId, setStudentId] = React.useState('');
  const [amountDue, setAmountDue] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [paymentAmounts, setPaymentAmounts] = React.useState({});
  const [paymentDates, setPaymentDates] = React.useState({});
  const [expandedId, setExpandedId] = React.useState('');
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [feeList, studentList] = await Promise.all([
        fetchFees(status),
        fetchStudents()
      ]);
      setFees(feeList);
      setStudents(studentList);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      loadData();
    }, 0);
  
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const handleCreate = async (event) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const student = students.find((item) => item.id === studentId
        || item._id === studentId);

      await createFee({ studentId, amountDue, dueDate });
      setStudentId('');
      setAmountDue('');
      setDueDate('');
      setSuccess(`Fee record created for ${student?.name || 'the student'}.`);
      await loadData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayment = async (event, fee) => {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await recordFeePayment(fee.id, {
        amount: paymentAmounts[fee.id],
        paidOn: paymentDates[fee.id] || undefined
      });
      setPaymentAmounts((current) => ({ ...current, [fee.id]: '' }));
      setPaymentDates((current) => ({ ...current, [fee.id]: '' }));
      setSuccess(`Payment recorded for ${fee.studentName || fee.usn || 'the student'}.`);
      await loadData();
    } catch (paymentError) {
      setError(paymentError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="widget-card fees-page">
      <h2>Fee management</h2>
      <p>Set student dues, record payments, and review payment history.</p>

      {error ? (
        <Alert variant="error" title="Fee operation failed" message={error} />
      ) : null}
      {success ? (
        <Alert variant="success" title="Success" message={success} />
      ) : null}

      <section aria-labelledby="create-fee-heading">
        <h3 id="create-fee-heading">Create fee record</h3>
        <form className="fee-create-form" onSubmit={handleCreate}>
          <label>
            Student
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              required
            >
              <option value="">Choose a student</option>
              {students.map((student) => {
                const id = student.id || student._id;
                return (
                  <option key={id} value={id}>
                    {student.usn} — {student.name}
                  </option>
                );
              })}
            </select>
          </label>

          <label>
            Amount due (₹)
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amountDue}
              onChange={(event) => setAmountDue(event.target.value)}
              required
            />
          </label>

          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Create fee'}
          </button>
        </form>
      </section>

      <section aria-labelledby="fee-list-heading">
        <div className="fees-list-heading">
          <h3 id="fee-list-heading">Fee records</h3>
          <label>
            Filter by status
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="partial">Partially paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </label>
        </div>

        {loading ? (
          <LoadingState label="Loading fee records…" />
        ) : fees.length === 0 ? (
          <p className="inline-note">No fee records found.</p>
        ) : (
          <div className="table-wrap">
            <table className="fees-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount due</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due date</th>
                  <th>Status</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((fee) => (
                  <React.Fragment key={fee.id}>
                    <tr>
                      <td>
                        <strong>{fee.studentName || 'Unknown student'}</strong>
                        <small>{fee.usn || ''}</small>
                      </td>
                      <td>{money(fee.amountDue)}</td>
                      <td>{money(fee.totalPaid)}</td>
                      <td>{money(fee.balance)}</td>
                      <td>{displayDate(fee.dueDate)}</td>
                      <td><span className={`pill pill-${fee.status.toLowerCase()}`}>{fee.status}</span></td>
                      <td>
                        <button
                          type="button"
                          onClick={() => setExpandedId((current) => current === fee.id ? '' : fee.id)}
                        >
                          {expandedId === fee.id ? 'Hide history' : 'History'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === fee.id ? (
                      <tr>
                        <td colSpan="7">
                          <h4>Payment history</h4>
                          {fee.payments.length ? (
                            <ul>
                              {fee.payments.map((payment, index) => (
                                <li key={`${fee.id}-${index}`}>
                                  {money(payment.amount)} — {displayDate(payment.paidOn)}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="inline-note">No payments recorded yet.</p>
                          )}

                          {fee.balance > 0 ? (
                            <form className="fee-payment-form" onSubmit={(event) => handlePayment(event, fee)}>
                              <label>
                                Payment amount (₹)
                                <input
                                  type="number"
                                  min="0.01"
                                  max={fee.balance}
                                  step="0.01"
                                  value={paymentAmounts[fee.id] || ''}
                                  onChange={(event) => setPaymentAmounts((current) => ({
                                    ...current,
                                    [fee.id]: event.target.value
                                  }))}
                                  required
                                />
                              </label>
                              <label>
                                Payment date
                                <input
                                  type="date"
                                  value={paymentDates[fee.id] || ''}
                                  onChange={(event) => setPaymentDates((current) => ({
                                    ...current,
                                    [fee.id]: event.target.value
                                  }))}
                                />
                              </label>
                              <button className="primary-button" type="submit" disabled={submitting}>
                                Record payment
                              </button>
                            </form>
                          ) : (
                            <p className="inline-note">This fee is fully paid.</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
