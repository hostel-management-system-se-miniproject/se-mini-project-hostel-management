import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { fetchStudentDashboard } from '../api/dashboard';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatDueDate(value) {
  const [year, month, day] = value.split('-');
  return `${Number(day)} ${MONTH_NAMES[Number(month) - 1]} ${year}`;
}

export function formatMoney(value) {
  return `₹${Number(value).toLocaleString('en-IN')}`;
}

function Detail({ label, value }) {
  return (
    <div className="student-dash-detail">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

Detail.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
};

export function DashboardView({ data }) {
  const { student, room, fee, complaints, leaves } = data;

  return (
    <div className="student-dash-layout">
      <section className="widget-card student-dash-profile">
        <h2>Profile</h2>
        <div className="student-dash-details">
          <Detail label="Name" value={student.name} />
          <Detail label="USN" value={student.usn} />
          <Detail label="Email" value={student.email} />
          <Detail label="Phone" value={student.phone} />
        </div>
      </section>

      <section className="widget-card student-dash-card">
        <h2>Room</h2>
        {room ? (
          <>
            <p className="student-dash-highlight">Room {room.roomNo}</p>
            <div className="student-dash-details">
              <Detail label="Block" value={room.block} />
              <Detail label="Floor" value={room.floor} />
              <Detail label="Sharing type" value={room.sharingType} />
            </div>
          </>
        ) : (
          <p className="inline-note">No room allocated yet. The hostel office will allocate one.</p>
        )}
      </section>

      <section className="widget-card student-dash-card">
        <h2>Fee</h2>
        {fee ? (
          <div className="student-dash-details">
            <Detail label="Amount due" value={formatMoney(fee.amountDue)} />
            <Detail label="Paid" value={formatMoney(fee.totalPaid)} />
            <Detail label="Balance" value={formatMoney(fee.balance)} />
            <Detail label="Due date" value={formatDueDate(fee.dueDate)} />
            <Detail label="Status" value={fee.status} />
          </div>
        ) : (
          <p className="inline-note">No fee record yet.</p>
        )}
      </section>

      <section className="widget-card student-dash-card">
        <h2>Complaints</h2>
        <p className="student-dash-count">{complaints.open} open of {complaints.total} total</p>
      </section>

      <section className="widget-card student-dash-card">
        <h2>Leaves</h2>
        <p className="student-dash-count">{leaves.pending} pending of {leaves.total} total</p>
      </section>
    </div>
  );
}

DashboardView.propTypes = {
  data: PropTypes.shape({
    student: PropTypes.shape({
      usn: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      phone: PropTypes.string.isRequired,
    }).isRequired,
    room: PropTypes.shape({
      roomNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      block: PropTypes.string.isRequired,
      floor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      sharingType: PropTypes.string.isRequired,
    }),
    fee: PropTypes.shape({
      amountDue: PropTypes.number.isRequired,
      dueDate: PropTypes.string.isRequired,
      totalPaid: PropTypes.number.isRequired,
      balance: PropTypes.number.isRequired,
      status: PropTypes.oneOf(['Due', 'Partially Paid', 'Paid']).isRequired,
    }),
    complaints: PropTypes.shape({
      open: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
    }).isRequired,
    leaves: PropTypes.shape({
      pending: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
    }).isRequired,
  }).isRequired,
};

export function StudentDashboardPage({ usn }) {
  const [state, setState] = React.useState({ loading: true, data: null, error: '' });
  const requestId = React.useRef(0);
  const activeController = React.useRef(null);
  const mounted = React.useRef(false);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeController.current?.abort();
    };
  }, []);

  const loadDashboard = React.useCallback(async () => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setState({ loading: true, data: null, error: '' });

    try {
      const data = await fetchStudentDashboard(usn, { signal: controller.signal });
      if (!mounted.current || currentRequestId !== requestId.current) return;
      setState({ loading: false, data, error: '' });
    } catch (error) {
      if (
        !mounted.current
        || currentRequestId !== requestId.current
        || error?.name === 'AbortError'
      ) return;
      setState({ loading: false, data: null, error: error.message });
    }
  }, [usn]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  if (state.loading) {
    return <LoadingState label="Loading your dashboard …" />;
  }

  if (state.error) {
    return (
      <>
        <Alert variant="error" title="Could not load your dashboard" message={state.error} />
        <button type="button" className="primary-button" onClick={loadDashboard}>
          Try again
        </button>
      </>
    );
  }

  return <DashboardView data={state.data} />;
}

StudentDashboardPage.propTypes = {
  usn: PropTypes.string.isRequired,
};
