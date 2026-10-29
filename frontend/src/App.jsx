import React from 'react';
import PropTypes from 'prop-types';
import { NavIcon } from './components/NavIcon';
import { PlaceholderPage } from './components/PlaceholderPage';
import { RoomsPage } from './pages/RoomsPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProtectedRoute } from './ProtectedRoute';
import { FeesPage } from './pages/FeesPage';
import {
  NAV_ITEMS,
  filterMenuItemsByRole,
  formatRoleName,
  getDefaultPathForRole,
} from './navigation';

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

function getInitials(name) {
  // Use the first letters of the first two words that start with a letter ("Student 001" gives "ST").
  const words = String(name).trim().split(/\s+/).filter((word) => /^[A-Za-z]/.test(word));
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

function renderPageContent(path, role, user, onNavigate) {
  if (path === '/dashboard') {
    if (role === 'student' && user?.usn) {
      return <StudentDashboardPage usn={user.usn} />;
    }
    return <AdminDashboardPage onNavigate={onNavigate} />;
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
    return <FeesPage />;
  }

  if (path === '/visitors') {
    return <VisitorsPage />;
  }

  if (path === '/reports') {
    return (
      <PlaceholderPage
        title="Reports"
        description="Operational reports and analytics for hostel administration can be generated here."
      />
    );
  }

  return (
    <PlaceholderPage
      title={role === 'admin' ? 'Admin overview' : 'Student overview'}
      description="This page has not been implemented yet."
    />
  );
}

function App({ user = null, onLogout = null }) {
  // With a logged-in user the role comes from the server session. Without one
  // (the HMS-03 demo and its tests) the role switcher is shown instead.
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

  const displayName = user?.name || user?.usn || formatRoleName(role);

  return (
    <div className="app-shell">
      <aside id="app-sidebar" className={`sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <span className="brand-mark">HMS</span>
          <div>
            <strong>Hostel Management</strong>
            <small>{role === 'admin' ? 'Hostel office' : 'Student portal'}</small>
          </div>
        </div>

        <nav aria-label="Sidebar navigation">
          {menuItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={currentPath === item.path ? 'nav-item active' : 'nav-item'}
              aria-current={currentPath === item.path ? 'page' : undefined}
              onClick={() => handleNavigation(item.path)}
            >
              <span className="icon" aria-hidden="true"><NavIcon name={item.icon} /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {user ? (
          <div className="sidebar-foot">
            <div className="user-box">
              <span className="avatar" aria-hidden="true">{getInitials(displayName)}</span>
              <div className="user-meta">
                <strong>{displayName}</strong>
                <small>{formatRoleName(user.role)}</small>
              </div>
              <button type="button" onClick={onLogout}>
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </aside>

      <div
        className={mobileMenuOpen ? 'scrim visible' : 'scrim'}
        aria-hidden="true"
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="menu-toggle"
              aria-label="Toggle navigation menu"
              aria-controls="app-sidebar"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              ☰
            </button>
            <h1>{activePage?.label ?? 'Overview'}</h1>
          </div>

          {user ? null : (
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

        <main className="content-area">
          <ProtectedRoute allowedRoles={activePage?.roles ?? ['student', 'admin']} currentRole={role}>
            {renderPageContent(currentPath, role, user, handleNavigation)}
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