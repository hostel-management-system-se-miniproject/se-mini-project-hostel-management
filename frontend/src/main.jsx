import React from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const VALID_ROLES = ['student', 'admin'];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', roles: ['student', 'admin'], icon: '▣' },
  { label: 'Complaints', path: '/complaints', roles: ['student', 'admin'], icon: '⚑' },
  { label: 'Leave', path: '/leave', roles: ['student', 'admin'], icon: '✈' },
  { label: 'Rooms', path: '/rooms', roles: ['admin'], icon: '⌂' },
  { label: 'Fees', path: '/fees', roles: ['admin'], icon: '₹' },
  { label: 'Visitors', path: '/visitors', roles: ['admin'], icon: '◎' },
  { label: 'Reports', path: '/reports', roles: ['admin'], icon: '▤' },
];

export function filterMenuItemsByRole(items, role) {
  return items.filter((item) => item.roles.includes(role));
}

function formatRoleName(role) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getDefaultPathForRole(role) {
  return filterMenuItemsByRole(NAV_ITEMS, role)[0]?.path ?? '/dashboard';
}

function Table({ columns, rows }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? (
            rows.map((row, rowIndex) => (
              <tr key={`${rowIndex}-${row[columns[0].key]}`}>
                {columns.map((column) => (
                  <td key={`${rowIndex}-${column.key}`}>{row[column.key]}</td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="empty-state">No records found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Alert({ variant = 'info', title, message }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}

function LoadingState({ label = 'Loading …' }) {
  return (
    <div className="loading-state" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function FormExample() {
  const [form, setForm] = React.useState({ name: '', room: '', note: '' });
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError('');
    setSuccess('');
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = {
      name: form.name.trim(),
      room: form.room.trim(),
      note: form.note.trim(),
    };

    if (!trimmed.name || !trimmed.room || !trimmed.note) {
      setError('Please complete all fields before submitting the request.');
      setSuccess('');
      return;
    }

    setSuccess(`Request submitted for ${trimmed.name} in room ${trimmed.room}.`);
    setError('');
    setForm({ name: '', room: '', note: '' });
  };

  return (
    <div className="form-card">
      <h3>Quick form example</h3>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          <span>Name</span>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Student name" />
        </label>
        <label>
          <span>Room</span>
          <input name="room" value={form.room} onChange={handleChange} placeholder="A-204" />
        </label>
        <label className="full-width">
          <span>Message</span>
          <textarea name="note" value={form.note} onChange={handleChange} placeholder="Describe the issue or request" rows="4" />
        </label>
        {error ? <Alert variant="error" title="Validation error" message={error} /> : null}
        {success ? <Alert variant="success" title="Success" message={success} /> : null}
        <button type="submit" className="primary-button">Submit request</button>
      </form>
    </div>
  );
}

function ProtectedRoute({ allowedRoles, currentRole, children }) {
  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="placeholder-page warn">
        <h2>Access restricted</h2>
        <p>This section is not available for the {formatRoleName(currentRole)} role.</p>
      </div>
    );
  }

  return children;
}

function PlaceholderPage({ title, description, actionText = 'This page is still under development.' }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-badge">Placeholder</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="inline-note">{actionText}</div>
    </div>
  );
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
      <Alert variant="success" title="Welcome back" message="The role-based landing screen is active and ready to guide the user." />

      <div className="stats-grid">
        {stats.map((stat) => (
          <div className="stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel-grid">
        <FormExample />
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

function renderPageContent(path, role) {
  const sharedProps = {
    title: 'Overview',
    description: 'The page is in progress. This placeholder keeps the interface usable while future screens are built.',
  };

  if (path === '/dashboard') {
    return <DashboardPage />;
  }

  if (path === '/complaints') {
    return <PlaceholderPage title="Complaints" description="Students and admins can track complaints, open tickets, and review actions here." {...sharedProps} />;
  }

  if (path === '/leave') {
    return <PlaceholderPage title="Leave" description="Leave status, approval flow, and balance information will live here." {...sharedProps} />;
  }

  if (path === '/rooms') {
    return <PlaceholderPage title="Rooms" description="Room allocation, occupancy and maintenance tasks can be managed here." {...sharedProps} />;
  }

  if (path === '/fees') {
    return <PlaceholderPage title="Fees" description="Payment summaries, outstanding dues, and fee collection records will be displayed here." {...sharedProps} />;
  }

  if (path === '/visitors') {
    return <PlaceholderPage title="Visitors" description="Visitor logs and gate-entry approval details will appear in this screen." {...sharedProps} />;
  }

  if (path === '/reports') {
    return <PlaceholderPage title="Reports" description="Operational reports and analytics for hostel administration can be generated here." {...sharedProps} />;
  }

  return <PlaceholderPage title={role === 'admin' ? 'Admin overview' : 'Student overview'} description="This page has not been implemented yet." />;
}

function App() {
  const [role, setRole] = React.useState('student');
  const [currentPath, setCurrentPath] = React.useState('/dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = React.useMemo(() => filterMenuItemsByRole(NAV_ITEMS, role), [role]);

  React.useEffect(() => {
    if (!menuItems.some((item) => item.path === currentPath)) {
      setCurrentPath(getDefaultPathForRole(role));
    }
  }, [currentPath, menuItems, role]);

  const activePage = NAV_ITEMS.find((item) => item.path === currentPath) ?? NAV_ITEMS[0];

  const handleNavigation = (path) => {
    const target = NAV_ITEMS.find((item) => item.path === path);
    if (!target || !target.roles.includes(role)) {
      return;
    }

    setCurrentPath(path);
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

        <div className="role-switcher" aria-label="Role selector">
          {VALID_ROLES.map((item) => (
            <button
              key={item}
              type="button"
              className={item === role ? 'active' : ''}
              onClick={() => setRole(item)}
            >
              {formatRoleName(item)}
            </button>
          ))}
        </div>
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
            {renderPageContent(currentPath, role)}
          </ProtectedRoute>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

export default App;
