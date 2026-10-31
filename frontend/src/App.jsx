import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from './components/Alert';
import { FormDemo } from './components/FormDemo';
import { PlaceholderPage } from './components/PlaceholderPage';
import { Table } from './components/Table';
import { RoomsPage } from './pages/RoomsPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { ProtectedRoute } from './ProtectedRoute';
import {
  NAV_ITEMS,
  filterMenuItemsByRole,
  formatRoleName,
  getDefaultPathForRole,
} from './navigation';
import { downloadReport } from './api/reports';

const EXPORT_OPTIONS = [
  { label: 'Student CSV', type: 'student', format: 'csv' },
  { label: 'Student PDF', type: 'student', format: 'pdf' },
  { label: 'Fee CSV', type: 'fee', format: 'csv' },
  { label: 'Fee PDF', type: 'fee', format: 'pdf' },
  { label: 'Complaint CSV', type: 'complaint', format: 'csv' },
  { label: 'Complaint PDF', type: 'complaint', format: 'pdf' },
];

function useCurrentPath() {
  const [currentPath, setCurrentPath] = React.useState(
    window.location.pathname || '/dashboard',
  );

  React.useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || '/dashboard');
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigate = React.useCallback((nextPath) => {
    const normalized = nextPath.startsWith('/') ? nextPath : `/${nextPath}`;
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', normalized);
    }
    setCurrentPath(normalized);
  }, []);

  return [currentPath, navigate];
}

function DashboardPage() {
  const stats = [
    { label: 'Occupied rooms', value: '84%' },
    { label: 'Open complaints', value: '12' },
    { label: 'Pending leave', value: '7' },
  ];

  const rows = [
    { name: 'Aisha', room: 'A-204', status: 'Checked in' },
    { name: 'Ravi', room: 'B-118', status: 'Pending' },
    { name: 'Nirmal', room: 'C-301', status: 'Approved' },
  ];

  return (
    <>
      <Alert
        variant="success"
        title="Welcome back"
        message="The role-based landing screen is active and ready to guide the user."
      />

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <FormDemo />

        <div className="widget-card">
          <h3>Recent activity</h3>
          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'room', label: 'Room' },
              { key: 'status', label: 'Status' },
            ]}
            rows={rows}
          />
        </div>
      </div>
    </>
  );
}

function ReportsPage({ role = 'admin' }) {
  const [status, setStatus] = React.useState({ kind: '', message: '' });
  const [busy, setBusy] = React.useState(null);

  const handleExport = async (type, format) => {
    setBusy(`${type}:${format}`);
    setStatus({ kind: '', message: '' });

    try {
      await downloadReport(type, format);
      setStatus({ kind: 'success', message: `${type} ${format.toUpperCase()} export started.` });
    } catch (error) {
      setStatus({ kind: 'error', message: error.message || 'The export could not be created.' });
    } finally {
      setBusy(null);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="widget-card">
        <h3>Reports</h3>
        <p className="inline-note">Only admins can export hostel reports.</p>
      </div>
    );
  }

  return (
    <div className="widget-card">
      <h3>Export reports</h3>
      <p className="inline-note">Download the current hostel records as CSV or PDF.</p>

      {status.message ? (
        <Alert
          variant={status.kind === 'success' ? 'success' : 'error'}
          title={status.kind === 'success' ? 'Export ready' : 'Export failed'}
          message={status.message}
        />
      ) : null}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginTop: '18px',
        }}
      >
        {EXPORT_OPTIONS.map((option) => (
          <button
            key={`${option.type}-${option.format}`}
            type="button"
            onClick={() => handleExport(option.type, option.format)}
            disabled={busy !== null}
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #d0d7de',
              background: busy === `${option.type}:${option.format}` ? '#f0f4f8' : '#ffffff',
              cursor: busy !== null ? 'wait' : 'pointer',
              fontWeight: 600,
              textAlign: 'left',
            }}
          >
            {busy === `${option.type}:${option.format}` ? 'Preparing…' : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

ReportsPage.propTypes = {
  role: PropTypes.oneOf(['student', 'admin']),
};

function renderPageContent(path, role, user) {
  if (path === '/dashboard') {
    if (role === 'student' && user?.usn) {
      return <StudentDashboardPage usn={user.usn} />;
    }
    return <DashboardPage />;
  }

  if (path === '/complaints') {
    return <ComplaintsPage role={role} />;
  }

  if (path === '/leave') {
    return (
      <PlaceholderPage
        title="Leave"
        description="Leave status, approval flow, and balance information will live here."
      />
    );
  }

  if (path === '/rooms') {
    return <RoomsPage />;
  }

  if (path === '/allocations') {
    return <AllocationsPage />;
  }

  if (path === '/fees') {
    return (
      <PlaceholderPage
        title="Fees"
        description="Payment summaries, outstanding dues, and fee collection records will be displayed here."
      />
    );
  }

  if (path === '/visitors') {
    return <VisitorsPage />;
  }

  if (path === '/reports') {
    return <ReportsPage role={role} />;
  }

  return (
    <PlaceholderPage
      title={role === 'admin' ? 'Admin overview' : 'Student overview'}
      description="This page has not been implemented yet."
    />
  );
}

function App({ user = null, onLogout = null }) {
  const [role, setRole] = React.useState(user?.role ?? 'student');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [currentPath, navigate] = useCurrentPath();

  const menuItems = React.useMemo(() => filterMenuItemsByRole(NAV_ITEMS, role), [role]);

  React.useEffect(() => {
    if (!menuItems.some((item) => item.path === currentPath)) {
      navigate(getDefaultPathForRole(role));
    }
  }, [currentPath, menuItems, navigate, role]);

  const activePage = NAV_ITEMS.find((item) => item.path === currentPath) ?? NAV_ITEMS[0];

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setMobileMenuOpen(false);
    navigate(getDefaultPathForRole(nextRole));
  };

  const handleNavigation = (targetPath) => {
    const target = NAV_ITEMS.find((item) => item.path === targetPath);
    if (!target || !target.roles.includes(role)) {
      return;
    }

    navigate(targetPath);
    setMobileMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="menu-toggle"
            aria-label="Toggle navigation menu"
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            ☰
          </button>

          <div className="brand">
            <span className="brand-mark">HMS</span>
            <div>
              <strong>Hostel Management</strong>
              <small>Role console</small>
            </div>
          </div>
        </div>

        {user ? (
          <div className="user-box">
            <span>{user.name || user.usn || formatRoleName(user.role)}</span>
            <button type="button" onClick={onLogout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="role-switcher" aria-label="Role selector">
            {['student', 'admin'].map((item) => (
              <button
                key={item}
                type="button"
                className={item === role ? 'active' : ''}
                onClick={() => handleRoleChange(item)}
              >
                {formatRoleName(item)}
              </button>
            ))}
          </div>
        )}
      </header>

      <div className="layout-shell">
        <aside className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
          <nav aria-label="Sidebar navigation">
            {menuItems.map((item) => (
              <button
                key={item.path}
                type="button"
                className={currentPath === item.path ? 'nav-item active' : 'nav-item'}
                onClick={() => handleNavigation(item.path)}
              >
                <span className="icon" aria-hidden="true">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="content-area">
          <div className="page-header">
            <div>
              <p className="eyebrow">{formatRoleName(role)} access</p>
              <h1>{activePage?.label ?? 'Overview'}</h1>
            </div>

            <div className="page-status">
              <span className="status-dot" aria-hidden="true" />
              Active
            </div>
          </div>

          <ProtectedRoute allowedRoles={activePage?.roles ?? ['student', 'admin']} currentRole={role}>
            {renderPageContent(currentPath, role, user)}
          </ProtectedRoute>
        </main>
      </div>
    </div>
  );
}

App.propTypes = {
  user: PropTypes.shape({
    role: PropTypes.string.isRequired,
    usn: PropTypes.string,
    name: PropTypes.string,
  }),
  onLogout: PropTypes.func,
};

export default App;
