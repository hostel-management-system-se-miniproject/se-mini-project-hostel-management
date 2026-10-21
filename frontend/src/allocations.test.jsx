import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  allocateRoom,
  fetchAvailableRooms,
  fetchUnallocatedStudents,
} from './api/allocations';
import { AllocationForm, AllocationResult } from './pages/AllocationsPage';

const student = { usn: 'PES1UG24CS001', name: 'Ravi Kumar', email: 'ravi@example.com' };
const room = { id: 'r1', roomNo: 'A-204', block: 'A', floor: 2, sharingType: 'Triple', capacity: 3, vacancy: 1 };

function fakeFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('allocation API', () => {
  it('builds student URLs with and without an encoded search', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [student] });
    await fetchUnallocatedStudents('', { fetchImpl });
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/students?unallocated=true');
    expect(fetchImpl.mock.calls[0][0]).not.toContain('search=');

    await fetchUnallocatedStudents('a&b', { fetchImpl });
    expect(fetchImpl.mock.calls[1][0]).toContain('unallocated=true&search=a%26b');
    expect(fetchImpl.mock.calls[1][1].credentials).toBe('include');
  });

  it('posts an allocation with credentials and returns its data', async () => {
    const allocation = { id: 'a1', usn: student.usn, room: room.roomNo, status: 'active' };
    const fetchImpl = fakeFetch(201, { success: true, data: allocation });
    await expect(allocateRoom({ usn: student.usn, roomId: room.id }, { fetchImpl })).resolves.toEqual(allocation);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'POST',
      body: JSON.stringify({ usn: student.usn, roomId: room.id }),
    });
  });

  it('filters unavailable rooms and maps forbidden access', async () => {
    const fetchImpl = fakeFetch(200, {
      success: true,
      data: [room, { ...room, id: 'r2', vacancy: 0 }],
    });
    await expect(fetchAvailableRooms({ fetchImpl })).resolves.toEqual([room]);

    await expect(fetchAvailableRooms({
      fetchImpl: fakeFetch(403, { success: false }),
    })).rejects.toThrow('Only an admin can allocate rooms.');
  });

  it('maps server errors and network failures to plain messages', async () => {
    const cases = [
      ['ROOM_FULL', 409, 'This room has just become full. Please choose another room.'],
      ['ALREADY_ALLOCATED', 409, 'This student already has a room.'],
      ['NOT_FOUND', 404, 'The student or the room could not be found. Refresh the page and try again.'],
      ['INVALID_USN', 400, 'The USN is invalid.'],
      ['VALIDATION_ERROR', 400, 'Missing roomId.'],
    ];
    for (const [code, status, message] of cases) {
      const fetchImpl = fakeFetch(status, { success: false, error: { code, message } });
      await expect(allocateRoom({ usn: student.usn, roomId: room.id }, { fetchImpl })).rejects.toMatchObject({
        message,
        code,
      });
    }
    await expect(allocateRoom({ usn: student.usn, roomId: room.id }, {
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('network')),
    })).rejects.toMatchObject({
      message: 'Could not reach the server. Check your connection and try again.',
      code: 'NETWORK_ERROR',
    });
    for (const [status, message, code] of [
      [401, 'Your session has expired. Please log in again.', 'SESSION_EXPIRED'],
      [403, 'Only an admin can allocate rooms.', 'FORBIDDEN'],
    ]) {
      await expect(allocateRoom({ usn: student.usn, roomId: room.id }, {
        fetchImpl: fakeFetch(status, { success: false }),
      })).rejects.toMatchObject({ message, code });
    }
  });
});

describe('allocation components', () => {
  it('renders selection, summary and disabled/enabled confirmation states', () => {
    const empty = renderToStaticMarkup(
      <AllocationForm students={[student]} rooms={[room]} selectedStudent="" selectedRoom="" />,
    );
    expect(empty).toContain('disabled');
    const selected = renderToStaticMarkup(
      <AllocationForm students={[student]} rooms={[room]} selectedStudent={student.usn} selectedRoom={room.id} />,
    );
    expect(selected).toContain('Allocate Ravi Kumar (PES1UG24CS001) to room A-204?');
    expect(selected).not.toContain('disabled');

    const submitting = renderToStaticMarkup(
      <AllocationForm students={[student]} rooms={[room]} selectedStudent={student.usn} selectedRoom={room.id} submitting />,
    );
    expect(submitting).toContain('Allocating…');
    expect(submitting).toContain('disabled');
  });

  it('renders result variants and empty states', () => {
    expect(renderToStaticMarkup(<AllocationResult success="Ravi was allocated." />)).toContain('Ravi was allocated.');
    expect(renderToStaticMarkup(<AllocationResult error="This room has just become full." />)).toContain('This room has just become full.');
    expect(renderToStaticMarkup(<AllocationForm students={[]} rooms={[]} search="" />)).toContain('Every student already has a room');
    expect(renderToStaticMarkup(<AllocationForm students={[]} rooms={[]} search="abc" />)).toContain('No unallocated students match this search');
    expect(renderToStaticMarkup(<AllocationForm students={[student]} rooms={[]} search="" />)).toContain('No rooms currently have vacancy');
    expect(renderToStaticMarkup(
      <AllocationResult error="Your session has expired." errorTitle="Could not load students and rooms" />,
    )).toContain('Could not load students and rooms');
    const failed = renderToStaticMarkup(
      <AllocationForm students={[]} rooms={[]} search="" loadFailed />,
    );
    expect(failed).not.toContain('Every student already has a room');
    expect(failed).not.toContain('No rooms currently have vacancy');
  });
});
