import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { renderPageContent } from './App';
import { AuthGate } from './AuthGate';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AllocationsPage } from './pages/AllocationsPage';
import { PlaceholderPage } from './components/PlaceholderPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { FeesPage } from './pages/FeesPage';
import { LeavePage } from './pages/LeavePage';
import { ReportsPage } from './pages/ReportsPage';
import { RoomsPage } from './pages/RoomsPage';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { StudentFeesPage } from './pages/StudentFeesPage';
import { VisitorsPage } from './pages/VisitorsPage';
import { NAV_ITEMS, filterMenuItemsByRole, getDefaultPathForRole } from './navigation';

const admin = { role: 'admin', usn: null };
const student = { role: 'student', usn: 'PES1UG24CS001' };

function typeFor(path, user) {
  return renderPageContent(path, user.role, user, () => {}).type;
}

describe('page routing (App)', () => {
  it('shows the admin dashboard to an admin and the student dashboard to a student', () => {
    expect(typeFor('/dashboard', admin)).toBe(AdminDashboardPage);
    expect(typeFor('/dashboard', student)).toBe(StudentDashboardPage);
  });

  it('passes the student USN to the student pages', () => {
    const dashboard = renderPageContent('/dashboard', 'student', student, () => {});
    expect(dashboard.props.usn).toBe('PES1UG24CS001');
    const fees = renderPageContent('/fees', 'student', student, () => {});
    expect(fees.type).toBe(StudentFeesPage);
    expect(fees.props.usn).toBe('PES1UG24CS001');
  });

  it('shows the fee management screen to an admin', () => {
    expect(typeFor('/fees', admin)).toBe(FeesPage);
  });

  it('routes Leave, Reports, Complaints, Rooms, Allocations and Visitors to their pages', () => {
    expect(typeFor('/leave', admin)).toBe(LeavePage);
    expect(typeFor('/leave', student)).toBe(LeavePage);
    expect(typeFor('/reports', admin)).toBe(ReportsPage);
    expect(typeFor('/complaints', student)).toBe(ComplaintsPage);
    expect(typeFor('/rooms', admin)).toBe(RoomsPage);
    expect(typeFor('/allocations', admin)).toBe(AllocationsPage);
    expect(typeFor('/visitors', admin)).toBe(VisitorsPage);
  });

  it('gives the role to the pages that depend on it', () => {
    expect(renderPageContent('/leave', 'admin', admin, () => {}).props.role).toBe('admin');
    expect(renderPageContent('/reports', 'student', student, () => {}).props.role).toBe('student');
  });

  it('asks a user without a USN to log in as a student on the fee page', () => {
    const markup = renderToStaticMarkup(renderPageContent('/fees', 'student', { role: 'student' }, () => {}));
    expect(markup).toContain('Log in as a student to see your fee details.');
  });

  it('shows a placeholder for an unknown path, named for the role', () => {
    const forAdmin = renderToStaticMarkup(renderPageContent('/nowhere', 'admin', admin, () => {}));
    expect(forAdmin).toContain('Admin overview');
    expect(forAdmin).toContain('This page has not been implemented yet.');
    const forStudent = renderToStaticMarkup(renderPageContent('/nowhere', 'student', student, () => {}));
    expect(forStudent).toContain('Student overview');
  });

  it('has a real page behind every admin menu item', () => {
    for (const item of filterMenuItemsByRole(NAV_ITEMS, 'admin')) {
      expect(renderPageContent(item.path, 'admin', admin, () => {}).type).not.toBe(PlaceholderPage);
    }
  });

  it('has a real page behind every student menu item', () => {
    for (const item of filterMenuItemsByRole(NAV_ITEMS, 'student')) {
      expect(renderPageContent(item.path, 'student', student, () => {}).type).not.toBe(PlaceholderPage);
    }
  });

  it('starts every role on its first menu item', () => {
    expect(getDefaultPathForRole('admin')).toBe('/dashboard');
    expect(getDefaultPathForRole('student')).toBe('/dashboard');
  });
});

describe('login gate (AuthGate)', () => {
  it('shows a "checking" message until the server has answered', () => {
    expect(renderToStaticMarkup(<AuthGate />)).toContain('Checking your session...');
  });
});
