import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      // main.jsx only mounts the app in the browser, so it is left out of the coverage figures.
      exclude: ['src/main.jsx', 'src/**/*.test.{js,jsx}']
    }
  }
});
