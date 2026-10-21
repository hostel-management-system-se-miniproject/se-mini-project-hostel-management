import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from '../components/Alert';
import { LoadingState } from '../components/LoadingState';
import { Table } from '../components/Table';
import { EMPTY_FILTERS, fetchRooms, hasActiveFilters } from '../api/rooms';

const SHARING_OPTIONS = ['single', 'double', 'triple', 'quad'];

export const ROOM_COLUMNS = [
  { key: 'roomNo', label: 'Room' },
  { key: 'block', label: 'Block' },
  { key: 'floor', label: 'Floor' },
  { key: 'sharingType', label: 'Sharing' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'occupancy', label: 'Occupancy' },
  { key: 'vacancy', label: 'Vacancy' },
];

// Shows the table, or a clear message when there is nothing to show.
export function RoomsResults({ rooms, filtered }) {
  if (rooms.length === 0) {
    return (
      <div className="inline-note" role="status">
        {filtered
          ? 'No rooms match these filters. Change or reset the filters to see more rooms.'
          : 'No rooms have been added yet.'}
      </div>
    );
  }

  return (
    <>
      <p className="eyebrow" role="status">
        {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
      </p>
      <Table columns={ROOM_COLUMNS} rows={rooms} />
    </>
  );
}

RoomsResults.propTypes = {
  rooms: PropTypes.arrayOf(PropTypes.object).isRequired,
  filtered: PropTypes.bool.isRequired,
};

export function RoomsPage() {
  const [draft, setDraft] = React.useState(EMPTY_FILTERS);
  const [applied, setApplied] = React.useState(EMPTY_FILTERS);
  // The result remembers which filters it belongs to, so "loading" is simply
  // "the newest filters have no result yet".
  const [result, setResult] = React.useState({ for: null, rooms: [], error: '' });

  React.useEffect(() => {
    const controller = new AbortController();
    fetchRooms(applied, { signal: controller.signal })
      .then((rooms) => setResult({ for: applied, rooms, error: '' }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setResult({ for: applied, rooms: [], error: error.message });
        }
      });
    return () => controller.abort();
  }, [applied]);

  const loading = result.for !== applied;

  const handleChange = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const handleApply = (event) => {
    event.preventDefault();
    setApplied({ ...draft });
  };

  const handleReset = () => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
  };

  return (
    <div className="widget-card">
      <h3>Room availability</h3>

      <form className="form-grid" onSubmit={handleApply} aria-label="Room filters">
        <label>
          Block
          <input type="text" value={draft.block} onChange={handleChange('block')} placeholder="e.g. A" />
        </label>

        <label>
          Floor
          <input
            type="number"
            min="0"
            step="1"
            value={draft.floor}
            onChange={handleChange('floor')}
            placeholder="e.g. 1"
          />
        </label>

        <label>
          Sharing
          <select value={draft.sharing} onChange={handleChange('sharing')}>
            <option value="">All</option>
            {SHARING_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Only rooms with vacancy</span>
          <input type="checkbox" checked={draft.available} onChange={handleChange('available')} />
        </label>

        <div className="full-width">
          <button type="submit" className="primary-button">Apply filters</button>{' '}
          <button type="button" onClick={handleReset}>Reset</button>
        </div>
      </form>

      {loading && <LoadingState label="Loading rooms …" />}
      {!loading && result.error && <Alert variant="error" title="Could not load rooms" message={result.error} />}
      {!loading && !result.error && (
        <RoomsResults rooms={result.rooms} filtered={hasActiveFilters(applied)} />
      )}
    </div>
  );
}
