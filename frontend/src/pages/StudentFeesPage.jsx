import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { fetchStudentFee } from '../api/studentFees';
import { feeStatusClass, formatFeeDate, formatRupees, normalizeFeeStatus, sortPayments } from '../feeFormat';
import '../fees-student.css';

function Detail({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

Detail.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

export function FeeSummary({ fee }) {
  return (
    <dl className="student-dash-details">
      <Detail label="Status" value={<span className={feeStatusClass(fee.status)}>{normalizeFeeStatus(fee.status)}</span>} />
      <Detail label="Amount due" value={formatRupees(fee.amountDue)} />
      <Detail label="Paid" value={formatRupees(fee.totalPaid)} />
      <Detail label="Balance" value={formatRupees(fee.balance)} />
      <Detail label="Due date" value={formatFeeDate(fee.dueDate)} />
    </dl>
  );
}

FeeSummary.propTypes = {
  fee: PropTypes.shape({
    status: PropTypes.string,
    amountDue: PropTypes.number,
    totalPaid: PropTypes.number,
    balance: PropTypes.number,
    dueDate: PropTypes.string,
  }).isRequired,
};

export function PaymentHistory({ payments }) {
  if (!payments || payments.length === 0) {
    return <p className="inline-note">No payments recorded yet.</p>;
  }

  return (
    <table className="fee-history">
      <caption className="eyebrow">Payment history</caption>
      <thead>
        <tr>
          <th scope="col">Paid on</th>
          <th scope="col">Amount</th>
        </tr>
      </thead>
      <tbody>
        {sortPayments(payments).map((payment, index) => (
          <tr key={`${payment.paidOn}-${payment.amount}-${index}`}>
            <td>{formatFeeDate(payment.paidOn)}</td>
            <td>{formatRupees(payment.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

PaymentHistory.propTypes = {
  payments: PropTypes.arrayOf(PropTypes.shape({
    amount: PropTypes.number,
    paidOn: PropTypes.string,
  })),
};

// The page body for a loaded result: fee details, or a clear message when there is no fee record.
export function FeeDetails({ fee }) {
  if (!fee) {
    return (
      <p className="inline-note" role="status">
        No fee record has been created for you yet. Please contact the hostel office.
      </p>
    );
  }

  return (
    <>
      <FeeSummary fee={fee} />
      <PaymentHistory payments={fee.payments} />
    </>
  );
}

FeeDetails.propTypes = {
  fee: PropTypes.object,
};

export function StudentFeesPage({ usn }) {
  const [result, setResult] = React.useState({ for: null, fee: null, error: '' });

  React.useEffect(() => {
    const controller = new AbortController();
    fetchStudentFee(usn, { signal: controller.signal })
      .then((fee) => setResult({ for: usn, fee, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ for: usn, fee: null, error: error.message });
        }
      });
    return () => controller.abort();
  }, [usn]);

  const loading = result.for !== usn;

  return (
    <div className="student-fee-page">
      <div className="widget-card">
        <h3>My fees</h3>
        {loading ? <LoadingState label="Loading your fee details …" /> : null}
        {!loading && result.error ? <Alert variant="error" title="Could not load fees" message={result.error} /> : null}
        {!loading && !result.error ? <FeeDetails fee={result.fee} /> : null}
      </div>
    </div>
  );
}

StudentFeesPage.propTypes = {
  usn: PropTypes.string.isRequired,
};

export default StudentFeesPage;
