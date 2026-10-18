import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProtectedRoute } from './ProtectedRoute';
import { NAV_ITEMS, filterMenuItemsByRole, getDefaultPathForRole } from './navigation';

describe('role-based menu configuration', () => {
  it('returns the student menu items only for the student role', () => {
    const studentMenu = filterMenuItemsByRole(NAV_ITEMS, 'student');

    expect(studentMenu.map((item) => item.label)).toEqual(['Dashboard', 'Complaints', 'Leave']);
  });

  it('returns all admin menu items for the admin role', () => {
    const adminMenu = filterMenuItemsByRole(NAV_ITEMS, 'admin');

    expect(adminMenu.map((item) => item.label)).toEqual([
      'Dashboard',
      'Complaints',
      'Leave',
      'Rooms',
      'Fees',
      'Visitors',
      'Reports',
    ]);
  });

  it('routes the default page to the first available item for that role', () => {
    expect(getDefaultPathForRole('student')).toBe('/dashboard');
    expect(getDefaultPathForRole('admin')).toBe('/dashboard');
  });
});

describe('route guard behaviour', () => {
  it('blocks unauthorized access', () => {
    const html = renderToStaticMarkup(
      <ProtectedRoute allowedRoles={['admin']} currentRole="student">
        <div>Allowed content</div>
      </ProtectedRoute>,
    );

    expect(html).toContain('Access restricted');
    expect(html).not.toContain('Allowed content');
  });

  it('allows authorized access', () => {
    const html = renderToStaticMarkup(
      <ProtectedRoute allowedRoles={['student']} currentRole="student">
        <div>Allowed content</div>
      </ProtectedRoute>,
    );

    expect(html).toContain('Allowed content');
  });
});
