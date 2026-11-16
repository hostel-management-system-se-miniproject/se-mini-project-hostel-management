import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { fetchAdminDashboard } from './api/dashboard';
import {
  AdminDashboardView,
  buildAttentionItems,
  greetingFor,
  occupancyPercent,
} from './pages/AdminDashboardPage';

const summary = {
  totalOccupancy: 10,
  totalCapacity: 20,
  vacantRooms: 6,
  pendingFeeDues: 6000,
  openComplaints: 1,
  totalRooms: 9,
  fullRooms: 3,
  unallocatedStudents: 13,
  overdueFees: 0,
  pendingLeaves: 1,
  visitorsInside: 0,
};

const calm = {
  totalOccupancy: 0,
  totalCapacity: 20,
  vacantRooms: 9,
  pendingFeeDues: 0,
  openComplaints: 0,
  totalRooms: 9,
  fullRooms: 0,
  unallocatedStudents: 0,
  overdueFees: 0,
  pendingLeaves: 0,
  visitorsInside: 0,
};

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('admin dashboard API', () => {
  it('calls the admin endpoint with credentials and returns the data', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: summary });
    await expect(fetchAdminDashboard({ fetchImpl })).resolves.toEqual(summary);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/admin/dashboard');
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ credentials: 'include' });
  });

  it('maps response and network failures to safe messages', async () => {
    await expect(fetchAdminDashboard({ fetchImpl: fakeFetch(401, {}) }))
      .rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await expect(fetchAdminDashboard({ fetchImpl: fakeFetch(403, {}) }))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(fetchAdminDashboard({ fetchImpl: fakeFetch(500, { success: false }) }))
      .rejects.toMatchObject({ code: 'REQUEST_FAILED' });
    await expect(fetchAdminDashboard({ fetchImpl: vi.fn().mockRejectedValue(new TypeError('x')) }))
      .rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});

describe('admin dashboard helpers', () => {
  it('computes the occupancy percentage and never divides by zero', () => {
    expect(occupancyPercent(10, 20)).toBe(50);
    expect(occupancyPercent(1, 3)).toBe(33);
    expect(occupancyPercent(0, 0)).toBe(0);
    expect(occupancyPercent(25, 20)).toBe(100);
  });

  it('chooses a greeting from the hour', () => {
    expect(greetingFor(new Date(2026, 9, 28, 9))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 9, 28, 14))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 9, 28, 20))).toBe('Good evening');
  });

  it('lists only the things that need attention, with actions where a page exists', () => {
    const items = buildAttentionItems(summary);
    expect(items.map((item) => item.id)).toEqual(['complaints', 'unallocated', 'leaves']);
    expect(items[0]).toMatchObject({ path: '/complaints' });
    expect(items[2].path).toBeUndefined();
    expect(buildAttentionItems(calm)).toEqual([]);
  });

  it('warns when every room is full or fees are overdue', () => {
    const items = buildAttentionItems({ ...calm, vacantRooms: 0, overdueFees: 2, visitorsInside: 1 });
    expect(items.map((item) => item.id)).toEqual(['full', 'overdue', 'visitors']);
    expect(items[1].text).toBe('2 fee records past the due date.');
    expect(items[2].text).toBe('1 visitor still inside the hostel.');
  });
});

describe('admin dashboard view', () => {
  const now = new Date(2026, 9, 28, 14, 0);

  it('shows the real figures, the quick actions and the attention list', () => {
    const markup = renderToStaticMarkup(<AdminDashboardView summary={summary} now={now} />);
    expect(markup).toContain('Good afternoon');
    expect(markup).toContain('10 / 20');
    expect(markup).toContain('50% of capacity');
    expect(markup).toContain('₹6,000');
    expect(markup).toContain('None overdue');
    expect(markup).toContain('3 full, 9 rooms in all');
    expect(markup).toContain('Allocate a room');
    expect(markup).toContain('Log a visitor');
    expect(markup).toContain('1 complaint waiting for a decision.');
    expect(markup).toContain('13 students without a room.');
    expect(markup).not.toContain('84%');
    expect(markup).not.toContain('Welcome back');
  });

  it('shows the all-clear message when nothing needs attention', () => {
    const markup = renderToStaticMarkup(<AdminDashboardView summary={calm} now={now} />);
    expect(markup).toContain('Nothing needs attention right now.');
    expect(markup).toContain('0 of 20 beds are taken, 20 are free.');
  });

  it('works with only the five fields from the API contract', () => {
    const minimal = {
      totalOccupancy: 4,
      totalCapacity: 8,
      vacantRooms: 2,
      pendingFeeDues: 0,
      openComplaints: 0,
    };
    const markup = renderToStaticMarkup(<AdminDashboardView summary={minimal} now={now} />);
    expect(markup).toContain('4 / 8');
    expect(markup).toContain('Nothing needs attention right now.');
  });
});
