import React from 'react';

export function LoadingState({ label = 'Loading …' }) {
  return (
    <div className="loading-state" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
