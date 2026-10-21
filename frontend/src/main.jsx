import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthGate } from './AuthGate';
import './style.css';

const root = document.getElementById('root');

if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <AuthGate />
    </React.StrictMode>,
  );
}
