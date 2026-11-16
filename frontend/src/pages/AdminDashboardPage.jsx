import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { NavIcon } from '../components/NavIcon';
import { fetchAdminDashboard } from '../api/dashboard';
import { formatMoney } from './StudentDashboardPage';
import '../admin-dashboard.css';

const RING_RADIUS = 52;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export function occupancyPercent(totalOccupancy, totalCapacity) {
  if (!totalCapacity || totalCapacity <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((totalOccupancy / totalCapacity) * 100)));
}

export function greetingFor(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatToday(now) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(now);
}

function plural(count, singular, pluralForm = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// Plain rules over the dashboard numbers. Nothing here is guessed: every line is a count from the database.
export function buildAttentionItems(summary) {
  const items = [];
  const {
    totalRooms = 0,
    vacantRooms = 0,
    overdueFees = 0,
    openComplaints = 0,
    pendingLeaves = 0,
    unallocatedStudents = 0,
    visitorsInside = 0,
  } = summary;

  if (totalRooms > 0 && vacantRooms === 0) {
    items.push({ id: 'full', tone: 'danger', text: 'Every room is full. New students cannot be allocated.' });
  }
  if (overdueFees > 0) {
    items.push({ id: 'overdue', tone: 'danger', text: `${plural(overdueFees, 'fee record')} past the due date.` });
  }
  if (openComplaints > 0) {
    items.push({
      id: 'complaints',
      tone: 'warn',
      text: `${plural(openComplaints, 'complaint')} waiting for a decision.`,
      actionLabel: 'Review complaints',
      path: '/complaints',
    });
  }
  if (unallocatedStudents > 0) {
    items.push({
      id: 'unallocated',
      tone: 'warn',
      text: `${plural(unallocatedStudents, 'student')} without a room.`,
      actionLabel: 'Allocate rooms',
      path: '/allocations',
    });
  }
  if (pendingLeaves > 0) {
    items.push({ id: 'leaves', tone: 'warn', text: `${plural(pendingLeaves, 'leave request')} pending approval.` });
  }
  if (visitorsInside > 0) {
    items.push({
      id: 'visitors',
      tone: 'info',
      text: `${plural(visitorsInside, 'visitor')} still inside the hostel.`,
      actionLabel: 'Open visitor log',
      path: '/visitors',
    });
  }
  return items;
}

const QUICK_ACTIONS = [
  { path: '/allocations', icon: 'allocations', title: 'Allocate a room', hint: 'Place or move a student' },
  { path: '/visitors', icon: 'visitors', title: 'Log a visitor', hint: 'Record entry and exit' },
  { path: '/complaints', icon: 'complaints', title: 'Review complaints', hint: 'Update their status' },
  { path: '/rooms', icon: 'rooms', title: 'Browse rooms', hint: 'Check vacancies by block' },
];

function OccupancyRing({ percent }) {
  const filled = (percent / 100) * RING_LENGTH;
  return (
    <div className="admin-ring" role="img" aria-label={`${percent}% of beds occupied`}>
      <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
        <circle className="admin-ring-track" cx="60" cy="60" r={RING_RADIUS} />
        {filled > 0 ? (
          <circle
            className="admin-ring-fill"
            cx="60"
            cy="60"
            r={RING_RADIUS}
            strokeDasharray={`${filled} ${RING_LENGTH}`}
            transform="rotate(-90 60 60)"
          />
        ) : null}
      </svg>
      <span className="admin-ring-label">
        <strong>{percent}%</strong>
        <small>occupied</small>
      </span>
    </div>
  );
}

OccupancyRing.propTypes = { percent: PropTypes.number.isRequired };

function Kpi({ icon, label, value, note, tone }) {
  return (
    <div className={tone ? `admin-kpi admin-kpi-${tone}` : 'admin-kpi'}>
      <span className="admin-kpi-icon" aria-hidden="true"><NavIcon name={icon} /></span>
      <span className="admin-kpi-label">{label}</span>
      <strong className="admin-kpi-value">{value}</strong>
      <span className="admin-kpi-note">{note}</span>
    </div>
  );
}

Kpi.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  note: PropTypes.string.isRequired,
  tone: PropTypes.oneOf(['danger', 'warn']),
};

export function AdminDashboardView({ summary, now = new Date(), onNavigate = null }) {
  const percent = occupancyPercent(summary.totalOccupancy, summary.totalCapacity);
  const attention = buildAttentionItems(summary);
  const freeBeds = Math.max(0, summary.totalCapacity - summary.totalOccupancy);
  const overdue = summary.overdueFees ?? 0;
  const go = (path) => () => {
    if (onNavigate) onNavigate(path);
  };

  return (
    <div className="admin-dash">
      <section className="admin-hero" aria-label="Hostel today">
        <div className="admin-hero-text">
          <p className="admin-hero-date">{formatToday(now)}</p>
          <h2>{greetingFor(now)}</h2>
          <p className="admin-hero-line">
            {summary.totalOccupancy} of {summary.totalCapacity} beds are taken, {freeBeds}{' '}
            {freeBeds === 1 ? 'is' : 'are'} free.
          </p>
        </div>
        <OccupancyRing percent={percent} />
      </section>

      <div className="admin-kpis">
        <Kpi
          icon="bed"
          label="Beds occupied"
          value={`${summary.totalOccupancy} / ${summary.totalCapacity}`}
          note={`${percent}% of capacity`}
        />
        <Kpi
          icon="rooms"
          label="Rooms with a vacancy"
          value={String(summary.vacantRooms)}
          note={`${summary.fullRooms ?? 0} full, ${summary.totalRooms ?? 0} rooms in all`}
          tone={summary.totalRooms > 0 && summary.vacantRooms === 0 ? 'danger' : undefined}
        />
        <Kpi
          icon="fees"
          label="Pending fee dues"
          value={formatMoney(summary.pendingFeeDues)}
          note={overdue > 0 ? `${plural(overdue, 'record')} overdue` : 'None overdue'}
          tone={overdue > 0 ? 'danger' : undefined}
        />
        <Kpi
          icon="complaints"
          label="Open complaints"
          value={String(summary.openComplaints)}
          note={`${plural(summary.pendingLeaves ?? 0, 'leave request')} pending`}
          tone={summary.openComplaints > 0 ? 'warn' : undefined}
        />
      </div>

      <div className="admin-grid">
        <section className="widget-card admin-panel" aria-labelledby="admin-actions-title">
          <h3 id="admin-actions-title">Quick actions</h3>
          <div className="admin-actions">
            {QUICK_ACTIONS.map((action) => (
              <button key={action.path} type="button" className="admin-action" onClick={go(action.path)}>
                <span className="admin-action-icon" aria-hidden="true"><NavIcon name={action.icon} /></span>
                <strong>{action.title}</strong>
                <small>{action.hint}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="widget-card admin-panel" aria-labelledby="admin-attention-title">
          <h3 id="admin-attention-title">Needs attention</h3>
          {attention.length === 0 ? (
            <p className="admin-attention-clear">Nothing needs attention right now.</p>
          ) : (
            <ul className="admin-attention">
              {attention.map((item) => (
                <li key={item.id} className={`admin-attention-${item.tone}`}>
                  <span className="admin-attention-dot" aria-hidden="true" />
                  <span className="admin-attention-text">{item.text}</span>
                  {item.path ? (
                    <button type="button" className="admin-attention-link" onClick={go(item.path)}>
                      {item.actionLabel}
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

AdminDashboardView.propTypes = {
  summary: PropTypes.shape({
    totalOccupancy: PropTypes.number.isRequired,
    totalCapacity: PropTypes.number.isRequired,
    vacantRooms: PropTypes.number.isRequired,
    pendingFeeDues: PropTypes.number.isRequired,
    openComplaints: PropTypes.number.isRequired,
    totalRooms: PropTypes.number,
    fullRooms: PropTypes.number,
    unallocatedStudents: PropTypes.number,
    overdueFees: PropTypes.number,
    pendingLeaves: PropTypes.number,
    visitorsInside: PropTypes.number,
  }).isRequired,
  now: PropTypes.instanceOf(Date),
  onNavigate: PropTypes.func,
};

export function AdminDashboardPage({ onNavigate = null }) {
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
      const data = await fetchAdminDashboard({ signal: controller.signal });
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
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  if (state.loading) {
    return <LoadingState label="Loading the dashboard …" />;
  }

  if (state.error) {
    return (
      <>
        <Alert variant="error" title="Could not load the dashboard" message={state.error} />
        <button type="button" className="primary-button" onClick={loadDashboard}>
          Try again
        </button>
      </>
    );
  }

  return <AdminDashboardView summary={state.data} onNavigate={onNavigate} />;
}

AdminDashboardPage.propTypes = {
  onNavigate: PropTypes.func,
};
