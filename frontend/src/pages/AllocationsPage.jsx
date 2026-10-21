import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { allocateRoom, fetchAvailableRooms, fetchUnallocatedStudents } from '../api/allocations';

const noop = () => {};

export function AllocationResult({ success, error, errorTitle = 'Could not allocate room' }) {
  if (success) {
    return <Alert variant="success" title="Room allocated" message={success} />;
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
  const requestId = React.useRef(0);
  const activeController = React.useRef(null);
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

  React.useEffect(() => {
    const timer = window.setTimeout(() => loadLists(search), 300);
    return () => window.clearTimeout(timer);
  }, [loadLists, search]);

  React.useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      activeController.current?.abort();
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
      await loadLists(search);
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
            <button type="button" onClick={() => loadLists(search)}>Try again</button>
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
        </>
      )}
    </div>
  );
}
