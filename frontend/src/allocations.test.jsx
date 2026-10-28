import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  allocateRoom,
  fetchActiveAllocations,
  fetchAvailableRooms,
  fetchUnallocatedStudents,
  reallocateAllocation,
  vacateAllocation,
} from './api/allocations';
import { ConfirmDialog } from './components/ConfirmDialog';
import {
  AllocationForm,
  AllocationResult,
  AllocationsTable,
  ReallocatePanel,
} from './pages/AllocationsPage';

const student = { usn: 'PES1UG24CS001', name: 'Ravi Kumar', email: 'ravi@example.com' };
const room = { id: 'r1', roomNo: 'A-204', block: 'A', floor: 2, sharingType: 'Triple', capacity: 3, vacancy: 1 };
const allocation = {
  id: 'allocation/1',
  usn: 'PES1UG24CS001',
  studentName: 'Ravi Kumar',
  roomId: room.id,
  roomNo: room.roomNo,
  status: 'active',
  startedAt: '2026-10-20T09:30:00.000Z',
  endedAt: null,
  endReason: null,
};

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

  it('fetches active allocations and sends reallocate and vacate requests', async () => {
    const fetchImpl = fakeFetch(200, { success: true, data: [allocation] });
    await expect(fetchActiveAllocations({ fetchImpl })).resolves.toEqual([allocation]);
    expect(fetchImpl.mock.calls[0][0]).toContain('/api/allocations?active=true');
    expect(fetchImpl.mock.calls[0][1].credentials).toBe('include');

    const reallocateFetch = fakeFetch(200, { success: true, data: allocation });
    await reallocateAllocation('allocation/1', 'r2', { fetchImpl: reallocateFetch });
    expect(reallocateFetch.mock.calls[0]).toEqual([
      expect.stringContaining('/api/allocations/allocation%2F1/reallocate'),
      expect.objectContaining({
        credentials: 'include',
        method: 'PUT',
        body: JSON.stringify({ roomId: 'r2' }),
      }),
    ]);

    const vacateFetch = fakeFetch(200, { success: true, data: { ...allocation, status: 'inactive' } });
    await vacateAllocation('allocation/1', { fetchImpl: vacateFetch });
    expect(vacateFetch.mock.calls[0][1]).toMatchObject({
      credentials: 'include',
      method: 'POST',
      body: JSON.stringify({ confirm: true }),
    });
  });

  it('maps allocation action errors', async () => {
    for (const [code, status, message] of [
      ['ROOM_FULL', 409, 'This room has just become full. Please choose another room.'],
      ['NOT_FOUND', 404, 'This allocation is no longer active. Refresh the list.'],
      ['CONFIRMATION_REQUIRED', 400, 'Confirmation is required.'],
    ]) {
      await expect(vacateAllocation('a1', {
        fetchImpl: fakeFetch(status, { success: false, error: { code, message } }),
      })).rejects.toMatchObject({ code, message });
    }
    await expect(vacateAllocation('a1', {
      fetchImpl: vi.fn().mockRejectedValue(new TypeError('network')),
    })).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    await expect(vacateAllocation('a1', {
      fetchImpl: fakeFetch(401, { success: false }),
    })).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
    await expect(vacateAllocation('a1', {
      fetchImpl: fakeFetch(403, { success: false }),
    })).rejects.toMatchObject({ code: 'FORBIDDEN' });
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

  it('renders current allocation rows, actions and the empty state', () => {
    const markup = renderToStaticMarkup(
      <AllocationsTable allocations={[allocation]} rooms={[room]} />,
    );
    expect(markup).toContain('Ravi Kumar');
    expect(markup).toContain('Reallocate');
    expect(markup).toContain('Vacate');
    expect(markup).toContain('Oct 2026');
    expect(renderToStaticMarkup(<AllocationsTable allocations={[]} rooms={[]} />))
      .toContain('No active allocations yet');
  });

  it('lets the success title change so a vacate is not called an allocation', () => {
    const markup = renderToStaticMarkup(
      <AllocationResult success="Ravi Kumar left room A-204." successTitle="Room vacated" />,
    );
    expect(markup).toContain('Room vacated');
    expect(markup).not.toContain('Room allocated');
    expect(renderToStaticMarkup(<AllocationResult success="Done." />)).toContain('Room allocated');
  });

  it('renders a reallocate panel without the current room', () => {
    const otherRoom = { ...room, id: 'r2', roomNo: 'A-205', vacancy: 2 };
    const markup = renderToStaticMarkup(
      <ReallocatePanel allocation={allocation} rooms={[room, otherRoom]} />,
    );
    expect(markup).toContain('A-205');
    expect(markup).not.toContain('value="r1"');
    expect(markup).toContain('disabled');
    expect(renderToStaticMarkup(
      <ReallocatePanel allocation={allocation} rooms={[room, otherRoom]} selectedRoom="r2" />,
    )).toContain('Move Ravi Kumar (PES1UG24CS001) from A-204 to A-205?');
  });

  it('renders the controlled confirmation dialog', () => {
    const markup = renderToStaticMarkup(
      <ConfirmDialog
        isOpen
        title="Vacate this room?"
        message="Student 001 will leave room A-101 and the bed will be released."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain('Vacate this room?');
    expect(markup).toContain('Yes, vacate');
    expect(markup).toContain('Cancel');
    expect(renderToStaticMarkup(
      <ConfirmDialog
        isOpen
        title="Vacate this room?"
        message="Busy"
        onConfirm={() => {}}
        onCancel={() => {}}
        busy
      />,
    )).toContain('disabled');
  });
});
