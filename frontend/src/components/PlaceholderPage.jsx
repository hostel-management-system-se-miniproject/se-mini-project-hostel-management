import React from 'react';

export function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <div className="placeholder-badge">Placeholder</div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="inline-note">This page is still under development.</div>
    </div>
  );
}
