import PropTypes from 'prop-types';

// Simple outline icons, drawn for this app. The name comes from the `icon` field in navigation.js.
const PATHS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.6" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.6" />
    </>
  ),
  complaints: (
    <>
      <path d="M5 21V4" />
      <path d="M5 4.5h11l-2 4 2 4H5" />
    </>
  ),
  leave: (
    <>
      <rect x="4" y="8" width="16" height="12" rx="2" />
      <path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8" />
      <path d="M4 13h16" />
    </>
  ),
  rooms: (
    <>
      <rect x="5.5" y="3.5" width="13" height="17" rx="1.6" />
      <circle cx="15" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <path d="M3.5 20.5h17" />
    </>
  ),
  allocations: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M18 8v6M15 11h6" />
    </>
  ),
  fees: (
    <>
      <path d="M7 5h10M7 9.5h10" />
      <path d="M10 5c3.5 0 5 1.5 5 4.5S13.5 14 10 14H8l7 6" />
    </>
  ),
  visitors: (
    <>
      <circle cx="9" cy="9" r="3" />
      <path d="M3 20c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="8" r="2.4" />
      <path d="M17 13.2c2.6.3 4 2.2 4 4.8" />
    </>
  ),
  reports: (
    <>
      <path d="M5 20v-9M12 20V4M19 20v-6" />
    </>
  ),
};

export function NavIcon({ name }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name] ?? PATHS.dashboard}
    </svg>
  );
}

NavIcon.propTypes = {
  name: PropTypes.string.isRequired,
};
