import React from 'react';

export function Alert({ variant = 'info', title, message }) {
  return (
    <div className={`alert alert-${variant}`} role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  );
}
