import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoadingState } from '../components/LoadingState';
import {
  allocateRoom,
  fetchActiveAllocations,
  fetchAvailableRooms,
  fetchUnallocatedStudents,
  reallocateAllocation,
  vacateAllocation,
} from '../api/allocations';
import '../allocations.css';

const noop = () => {};

export function AllocationResult({
  success,
  error,
  errorTitle = 'Could not allocate room',
  successTitle = 'Room allocated',
}) {
  if (success) {
    return <Alert variant="success" title={successTitle} message={success} />;
  }
  if (error) {
    return <Alert variant="error" title={errorTitle} message={error} />;
  }
  return null;
}

AllocationResult.propTypes = {
  success: PropTypes.string,
  error: PropTypes.string,
  errorTitle: PropTypes.string,
  successTitle: PropTypes.string,
};

export function AllocationForm({
  students,
  rooms,
  selectedStudent = '',
  selectedRoom = '',
  search = '',
  onSearchChange = noop,
  onStudentChange = noop,
  onRoomChange = noop,
  onSubmit = noop,
  submitting = false,
  loadFailed = false,
}) {
  const student = students.find((item) => item.usn === selectedStudent);
  const room = rooms.find((item) => item.id === selectedRoom);
  const canSubmit = Boolean(student && room) && !submitting;

  return (
    <form onSubmit={onSubmit} className="allocation-form">
      <label className="allocation-search">
        Search unallocated students
        <input
          type="search"
          value={search}
          onChange={onSearchChange}
          placeholder="USN, name or email"
        />
      </label>

      <fieldset>
        <legend>Unallocated students</legend>
        {students.length > 0 ? (
          <div className="allocation-options">
            {students.map((item) => (
              <label className="allocation-option" key={item.usn}>
                <input
                  type="radio"
                  name="student"
                  value={item.usn}
                  checked={selectedStudent === item.usn}
                  onChange={onStudentChange}
                />
                <span><strong>{item.usn}</strong> — {item.name} ({item.email})</span>
              </label>
            ))}
          </div>
        ) : loadFailed ? null : (
          <p className="inline-note">
            {search.trim()
              ? 'No unallocated students match this search'
              : 'Every student already has a room'}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend>Rooms with vacancy</legend>
        {rooms.length > 0 ? (
          <div className="allocation-options">
            {rooms.map((item) => (
              <label className="allocation-option" key={item.id}>
                <input
                  type="radio"
                  name="room"
                  value={item.id}
                  checked={selectedRoom === item.id}
                  onChange={onRoomChange}
                />
                <span>
                  <strong>{item.roomNo}</strong> — Block {item.block}, Floor {item.floor},
                  {' '}{item.sharingType}, vacancy {item.vacancy} of {item.capacity}
                </span>
              </label>
            ))}
          </div>
        ) : loadFailed ? null : (
          <p className="inline-note">No rooms currently have vacancy</p>
        )}
      </fieldset>

      {student && room ? (
        <p className="allocation-summary">
          Allocate {student.name} ({student.usn}) to room {room.roomNo}?
        </p>
      ) : null}

      <button type="submit" className="primary-button" disabled={!canSubmit}>
        {submitting ? 'Allocating…' : 'Confirm'}
      </button>
    </form>
  );
}

AllocationForm.propTypes = {
  students: PropTypes.arrayOf(PropTypes.object).isRequired,
  rooms: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedStudent: PropTypes.string,
  selectedRoom: PropTypes.string,
  search: PropTypes.string,
  onSearchChange: PropTypes.func,
  onStudentChange: PropTypes.func,
  onRoomChange: PropTypes.func,
  onSubmit: PropTypes.func,
  submitting: PropTypes.bool,
  loadFailed: PropTypes.bool,
};

function formatAllocationDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function ReallocatePanel({
  allocation,
  rooms,
  selectedRoom = '',
  onRoomChange = noop,
  onSubmit = noop,
  onCancel = noop,
  submitting = false,
}) {
  const availableRooms = rooms.filter(
    (room) => Number(room.vacancy) > 0 && room.id !== allocation.roomId,
  );
  const selected = availableRooms.find((room) => room.id === selectedRoom);

  return (
    <div className="reallocate-panel">
      <label>
        Move to room
        <select value={selectedRoom} onChange={onRoomChange} disabled={submitting}>
          <option value="">Choose a room</option>
          {availableRooms.map((room) => (
            <option value={room.id} key={room.id}>{room.roomNo}</option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="reallocate-summary">
          Move {allocation.studentName} ({allocation.usn}) from {allocation.roomNo} to {selected.roomNo}?
        </p>
      ) : null}
      <div className="reallocate-panel-actions">
        <button type="button" className="primary-button" onClick={onSubmit} disabled={!selected || submitting}>
          {submitting ? 'Moving…' : 'Move student'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>Cancel</button>
      </div>
    </div>
  );
}

ReallocatePanel.propTypes = {
  allocation: PropTypes.shape({
    usn: PropTypes.string.isRequired,
    studentName: PropTypes.string.isRequired,
    roomId: PropTypes.string.isRequired,
    roomNo: PropTypes.string.isRequired,
  }).isRequired,
  rooms: PropTypes.arrayOf(PropTypes.object).isRequired,
  selectedRoom: PropTypes.string,
  onRoomChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onCancel: PropTypes.func,
  submitting: PropTypes.bool,
};

export function AllocationsTable({
  allocations,
  rooms,
  openAllocationId = '',
  selectedRoom = '',
  submitting = false,
  onReallocate = noop,
  onVacate = noop,
  onRoomChange = noop,
  onMove = noop,
  onCancel = noop,
  actionDisabled = false,
}) {
  if (allocations.length === 0) {
    return <p className="inline-note">No active allocations yet</p>;
  }

  return (
    <div className="table-wrap">
      <table className="allocations-table">
        <thead>
          <tr>
            <th>Student</th>
            <th>Room</th>
            <th>Since (date)</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {allocations.map((allocation) => (
            <React.Fragment key={allocation.id}>
              <tr>
                <td>
                  <span className="allocation-student">
                    <strong>{allocation.studentName}</strong>
                    <small>{allocation.usn}</small>
                  </span>
                </td>
                <td><span className="pill">{allocation.roomNo}</span></td>
                <td>{formatAllocationDate(allocation.startedAt)}</td>
                <td>
                  <div className="allocation-actions">
                    <button
                      type="button"
                      onClick={() => onReallocate(allocation.id)}
                      disabled={actionDisabled}
                    >
                      Reallocate
                    </button>
                    <button
                      type="button"
                      className="allocation-vacate"
                      onClick={() => onVacate(allocation.id)}
                      disabled={actionDisabled}
                    >
                      Vacate
                    </button>
                  </div>
                </td>
              </tr>
              {openAllocationId === allocation.id ? (
                <tr>
                  <td colSpan="4">
                    <ReallocatePanel
                      allocation={allocation}
                      rooms={rooms}
                      selectedRoom={selectedRoom}
                      onRoomChange={onRoomChange}
                      onSubmit={onMove}
                      onCancel={onCancel}
                      submitting={submitting}
                    />
                  </td>
                </tr>
              ) : null}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

AllocationsTable.propTypes = {
  allocations: PropTypes.arrayOf(PropTypes.object).isRequired,
  rooms: PropTypes.arrayOf(PropTypes.object).isRequired,
  openAllocationId: PropTypes.string,
  selectedRoom: PropTypes.string,
  submitting: PropTypes.bool,
  onReallocate: PropTypes.func,
  onVacate: PropTypes.func,
  onRoomChange: PropTypes.func,
  onMove: PropTypes.func,
  onCancel: PropTypes.func,
  actionDisabled: PropTypes.bool,
};

export function AllocationsPage() {
  const [search, setSearch] = React.useState('');
  const [students, setStudents] = React.useState([]);
  const [rooms, setRooms] = React.useState([]);
  const [selectedStudent, setSelectedStudent] = React.useState('');
  const [selectedRoom, setSelectedRoom] = React.useState('');
  const [initialLoadComplete, setInitialLoadComplete] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [errorTitle, setErrorTitle] = React.useState('Could not allocate room');
  const [allocations, setAllocations] = React.useState([]);
  const [allocationsLoaded, setAllocationsLoaded] = React.useState(false);
  const [allocationsLoadFailed, setAllocationsLoadFailed] = React.useState(false);
  const [allocationsLoadError, setAllocationsLoadError] = React.useState('');
  const [openAllocationId, setOpenAllocationId] = React.useState('');
  const [reallocateRoomId, setReallocateRoomId] = React.useState('');
  const [action, setAction] = React.useState(null);
  const [actionResult, setActionResult] = React.useState(null);
  const requestId = React.useRef(0);
  const activeController = React.useRef(null);
  const allocationsRequestId = React.useRef(0);
  const allocationsController = React.useRef(null);
  const actionRequestId = React.useRef(0);
  const actionController = React.useRef(null);
  const mounted = React.useRef(true);
  const initialLoadCompleteRef = React.useRef(false);

  const loadLists = React.useCallback(async (studentSearch = '') => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;
    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    const firstLoad = !initialLoadCompleteRef.current;

    if (firstLoad) {
      setInitialLoadComplete(false);
    } else {
      setUpdating(true);
    }
    setError('');
    try {
      const [studentList, roomList] = await Promise.all([
        fetchUnallocatedStudents(studentSearch, { signal: controller.signal }),
        fetchAvailableRooms({ signal: controller.signal }),
      ]);
      if (!mounted.current || currentRequestId !== requestId.current) return;
      setStudents(studentList);
      setRooms(roomList);
      setLoadFailed(false);
    } catch (loadError) {
      if (
        !mounted.current
        || currentRequestId !== requestId.current
        || loadError?.name === 'AbortError'
      ) return;
      setErrorTitle('Could not load students and rooms');
      setError(loadError.message);
      setLoadFailed(true);
    } finally {
      if (mounted.current && currentRequestId === requestId.current) {
        initialLoadCompleteRef.current = true;
        setInitialLoadComplete(true);
        setUpdating(false);
      }
    }
  }, []);

  const loadAllocations = React.useCallback(async () => {
    const currentRequestId = allocationsRequestId.current + 1;
    allocationsRequestId.current = currentRequestId;
    allocationsController.current?.abort();
    const controller = new AbortController();
    allocationsController.current = controller;
    setAllocationsLoaded(false);
    setAllocationsLoadFailed(false);
    setAllocationsLoadError('');
    try {
      const allocationList = await fetchActiveAllocations({ signal: controller.signal });
      if (!mounted.current || currentRequestId !== allocationsRequestId.current) return;
      setAllocations(allocationList);
    } catch (loadError) {
      if (
        !mounted.current
        || currentRequestId !== allocationsRequestId.current
        || loadError?.name === 'AbortError'
      ) return;
      setAllocationsLoadError(loadError.message);
      setAllocationsLoadFailed(true);
    } finally {
      if (mounted.current && currentRequestId === allocationsRequestId.current) {
        setAllocationsLoaded(true);
      }
    }
  }, []);

  React.useEffect(() => {
    const timer = window.setTimeout(() => loadLists(search), 300);
    return () => window.clearTimeout(timer);
  }, [loadLists, search]);

  React.useEffect(() => {
    const timer = window.setTimeout(() => loadAllocations(), 0);
    return () => window.clearTimeout(timer);
  }, [loadAllocations]);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeController.current?.abort();
      allocationsController.current?.abort();
      actionController.current?.abort();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const student = students.find((item) => item.usn === selectedStudent);
    const room = rooms.find((item) => item.id === selectedRoom);
    if (!student || !room || submitting) return;

    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      await allocateRoom({ usn: student.usn, roomId: room.id });
      setSuccess(`${student.name} was allocated to room ${room.roomNo}.`);
      setSelectedStudent('');
      setSelectedRoom('');
      await Promise.all([loadLists(search), loadAllocations()]);
    } catch (submitError) {
      setErrorTitle('Could not allocate room');
      setError(submitError.message);
      if (submitError.code === 'ROOM_FULL') {
        setSelectedRoom('');
        try {
          const roomList = await fetchAvailableRooms();
          setRooms(roomList);
        } catch (reloadError) {
          setErrorTitle('Could not reload rooms');
          setError(reloadError.message);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReallocate = (allocationId) => {
    if (action) return;
    setOpenAllocationId(allocationId);
    setReallocateRoomId('');
    setActionResult(null);
  };

  const handleVacate = (allocationId) => {
    if (action) return;
    setOpenAllocationId('');
    setReallocateRoomId('');
    setAction({ type: 'vacate', id: allocationId });
    setActionResult(null);
  };

  const finishAction = async (title, message) => {
    setActionResult({ kind: 'success', title, message });
    setOpenAllocationId('');
    setReallocateRoomId('');
    await Promise.all([loadAllocations(), loadLists(search)]);
  };

  const handleMove = async () => {
    const allocation = allocations.find((item) => item.id === openAllocationId);
    if (!allocation || !reallocateRoomId || action) return;
    const currentRequestId = actionRequestId.current + 1;
    actionRequestId.current = currentRequestId;
    const controller = new AbortController();
    actionController.current = controller;
    setAction({ type: 'reallocate', id: allocation.id });
    setActionResult(null);
    try {
      await reallocateAllocation(allocation.id, reallocateRoomId, { signal: controller.signal });
      if (!mounted.current || currentRequestId !== actionRequestId.current) return;
      const room = rooms.find((item) => item.id === reallocateRoomId);
      await finishAction('Room reallocated', `${allocation.studentName} moved to room ${room?.roomNo ?? reallocateRoomId}.`);
    } catch (actionError) {
      if (!mounted.current || currentRequestId !== actionRequestId.current || actionError?.name === 'AbortError') return;
      setActionResult({ kind: 'error', title: 'Could not reallocate', message: actionError.message });
      if (actionError.code === 'ROOM_FULL') {
        // Refresh only the rooms (loadLists would clear the message above) and make the admin pick again.
        setReallocateRoomId('');
        try {
          setRooms(await fetchAvailableRooms());
        } catch (reloadError) {
          setActionResult({ kind: 'error', title: 'Could not reload rooms', message: reloadError.message });
        }
      }
    } finally {
      if (mounted.current && currentRequestId === actionRequestId.current) setAction(null);
    }
  };

  const handleConfirmVacate = async () => {
    const allocation = allocations.find((item) => item.id === action?.id);
    if (!allocation || action?.type !== 'vacate') return;
    const currentRequestId = actionRequestId.current + 1;
    actionRequestId.current = currentRequestId;
    const controller = new AbortController();
    actionController.current = controller;
    setAction({ type: 'vacate', id: allocation.id, busy: true });
    setActionResult(null);
    try {
      await vacateAllocation(allocation.id, { signal: controller.signal });
      if (!mounted.current || currentRequestId !== actionRequestId.current) return;
      await finishAction('Room vacated', `${allocation.studentName} left room ${allocation.roomNo}.`);
    } catch (actionError) {
      if (!mounted.current || currentRequestId !== actionRequestId.current || actionError?.name === 'AbortError') return;
      setActionResult({ kind: 'error', title: 'Could not vacate', message: actionError.message });
    } finally {
      if (mounted.current && currentRequestId === actionRequestId.current) setAction(null);
    }
  };

  const selectedAllocation = allocations.find((item) => item.id === action?.id);

  return (
    <div className="widget-card">
      <h3>Allocate a room</h3>
      <AllocationResult success={success} error={error} errorTitle={errorTitle} />
      {!initialLoadComplete ? (
        <LoadingState label="Loading students and rooms …" />
      ) : (
        <>
          {updating ? <div role="status" className="inline-note">Updating…</div> : null}
          {loadFailed ? (
            <button type="button" className="allocation-retry" onClick={() => loadLists(search)}>Try again</button>
          ) : null}
          <AllocationForm
            students={students}
            rooms={rooms}
            selectedStudent={selectedStudent}
            selectedRoom={selectedRoom}
            search={search}
            onSearchChange={(event) => {
              setSearch(event.target.value);
              setSelectedStudent('');
              setSuccess('');
            }}
            onStudentChange={(event) => setSelectedStudent(event.target.value)}
            onRoomChange={(event) => setSelectedRoom(event.target.value)}
            onSubmit={handleSubmit}
            submitting={submitting}
            loadFailed={loadFailed}
          />
          <section className="allocations-current" aria-labelledby="current-allocations-heading">
            <h3 id="current-allocations-heading">Current allocations</h3>
            {actionResult ? (
              <Alert
                variant={actionResult.kind === 'success' ? 'success' : 'error'}
                title={actionResult.title}
                message={actionResult.message}
              />
            ) : null}
            {allocationsLoadFailed ? (
              <>
                <Alert variant="error" title="Could not load current allocations" message={allocationsLoadError} />
                <button type="button" className="allocation-retry" onClick={loadAllocations}>Try again</button>
              </>
            ) : !allocationsLoaded ? (
              <LoadingState label="Loading current allocations …" />
            ) : (
              <AllocationsTable
                allocations={allocations}
                rooms={rooms}
                openAllocationId={openAllocationId}
                selectedRoom={reallocateRoomId}
                submitting={action?.type === 'reallocate'}
                actionDisabled={Boolean(action)}
                onReallocate={handleReallocate}
                onVacate={handleVacate}
                onRoomChange={(event) => setReallocateRoomId(event.target.value)}
                onMove={handleMove}
                onCancel={() => {
                  setOpenAllocationId('');
                  setReallocateRoomId('');
                }}
              />
            )}
          </section>
        </>
      )}
      <ConfirmDialog
        isOpen={action?.type === 'vacate' && Boolean(selectedAllocation)}
        title="Vacate this room?"
        message={selectedAllocation
          ? `${selectedAllocation.studentName} (${selectedAllocation.usn}) will leave room ${selectedAllocation.roomNo} and the bed will be released.`
          : ''}
        onConfirm={handleConfirmVacate}
        onCancel={() => {
          if (!action?.busy) setAction(null);
        }}
        busy={Boolean(action?.busy)}
      />
    </div>
  );
}