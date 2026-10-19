import PropTypes from 'prop-types';
import { formatRoleName } from './navigation';

export function ProtectedRoute({ allowedRoles, currentRole, children }) {
  if (!allowedRoles.includes(currentRole)) {
    return (
      <div className="placeholder-page warn">
        <h2>Access restricted</h2>
        <p>This section is not available for the {formatRoleName(currentRole)} role.</p>
      </div>
    );
  }

  return children;
}

ProtectedRoute.propTypes = {
  allowedRoles: PropTypes.arrayOf(PropTypes.string).isRequired,
  currentRole: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};
