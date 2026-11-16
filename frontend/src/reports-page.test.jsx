import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EXPORT_OPTIONS, ReportsPage } from './pages/ReportsPage';
import { NAV_ITEMS, filterMenuItemsByRole } from './navigation';

describe('reports page', () => {
  it('offers a CSV and a PDF export for students, fees and complaints', () => {
    expect(EXPORT_OPTIONS.map((option) => `${option.type}:${option.format}`)).toEqual([
      'student:csv', 'student:pdf', 'fee:csv', 'fee:pdf', 'complaint:csv', 'complaint:pdf',
    ]);
    const markup = renderToStaticMarkup(<ReportsPage role="admin" />);
    for (const option of EXPORT_OPTIONS) {
      expect(markup).toContain(option.label);
    }
  });

  it('tells a student that only admins can export', () => {
    const markup = renderToStaticMarkup(<ReportsPage role="student" />);
    expect(markup).toContain('Only admins can export hostel reports.');
    expect(markup).not.toContain('Student CSV');
  });

  it('is in the admin menu only', () => {
    expect(filterMenuItemsByRole(NAV_ITEMS, 'admin').map((item) => item.path)).toContain('/reports');
    expect(filterMenuItemsByRole(NAV_ITEMS, 'student').map((item) => item.path)).not.toContain('/reports');
  });
});
