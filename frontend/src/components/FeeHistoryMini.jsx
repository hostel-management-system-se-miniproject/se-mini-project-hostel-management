import React from 'react';
import PropTypes from 'prop-types';
import { fetchStudentFee } from '../api/studentFees';
import { formatFeeDate, formatRupees, sortPayments } from '../feeFormat';
import '../fees-student.css';

// Latest payments for the dashboard fee card, read from GET /api/fees/{usn}.
export function RecentPayments({ payments, limit = 3 }) {
  if (!payments || payments.length === 0) {
    return <p className="inline-note">No payments recorded yet.</p>;
  }

  return (
    <ul className="fee-history-mini" aria-label="Recent payments">
      {sortPayments(payments).slice(0, limit).map((payment, index) => (
        <li key={`${payment.paidOn}-${payment.amount}-${index}`}>
          <span>{formatFeeDate(payment.paidOn)}</span>
          <strong>{formatRupees(payment.amount)}</strong>
        </li>
      ))}
    </ul>
  );
}

RecentPayments.propTypes = {
  payments: PropTypes.arrayOf(PropTypes.shape({ amount: PropTypes.number, paidOn: PropTypes.string })),
  limit: PropTypes.number,
};

export function FeeHistoryMini({ usn }) {
  const [result, setResult] = React.useState({ for: null, payments: null });

  React.useEffect(() => {
    const controller = new AbortController();
    fetchStudentFee(usn, { signal: controller.signal })
      .then((fee) => setResult({ for: usn, payments: fee ? fee.payments : [] }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ for: usn, payments: null });
        }
      });
    return () => controller.abort();
  }, [usn]);

  if (result.for !== usn || result.payments === null) {
    return null;
  }

  return (
    <>
      <RecentPayments payments={result.payments} />
      <p className="inline-note"><a href="/fees">View full fee details</a></p>
    </>
  );
}

FeeHistoryMini.propTypes = {
  usn: PropTypes.string.isRequired,
};
