import PropTypes from 'prop-types';
import '../login.css';

// Windows that are lit on the building. The rest stay dark.
const LIT_WINDOWS = [2, 5, 7, 11, 13, 16, 19, 22, 26, 28];
const COLUMNS = 5;
const ROWS = 6;

function Facade() {
  const windows = [];
  for (let row = 0; row < ROWS; row += 1) {
    for (let column = 0; column < COLUMNS; column += 1) {
      const index = row * COLUMNS + column;
      const litOrder = LIT_WINDOWS.indexOf(index);
      windows.push(
        <rect
          key={index}
          className={litOrder >= 0 ? 'win lit' : 'win'}
          style={litOrder >= 0 ? { '--n': litOrder } : undefined}
          x={34 + column * 58}
          y={40 + row * 52}
          width="38"
          height="32"
          rx="4"
        />,
      );
    }
  }

  return (
    <svg className="auth-facade" viewBox="0 0 360 400" aria-hidden="true" focusable="false">
      <rect className="wall" x="14" y="14" width="332" height="346" rx="10" />
      {windows}
      <rect className="door" x="152" y="334" width="56" height="26" rx="4" />
      <rect className="ground" x="0" y="360" width="360" height="40" />
    </svg>
  );
}

export function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <aside className="auth-aside">
        <div className="brand">
          <span className="brand-mark">HMS</span>
          <div>
            <strong>Hostel Management System</strong>
          </div>
        </div>
        <Facade />
        <p className="auth-tagline">
          Room allocation, complaints and visitor records for the hostel office and every resident.
        </p>
      </aside>
      <section className="auth-main">{children}</section>
    </main>
  );
}

AuthLayout.propTypes = {
  children: PropTypes.node.isRequired,
};
