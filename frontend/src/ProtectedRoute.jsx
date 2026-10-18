import React from 'react';
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
