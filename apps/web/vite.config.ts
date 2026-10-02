import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxying keeps the browser on one origin, which means EventSource for
      // the notification stream needs no CORS negotiation.
      '/api': { target: 'http://localhost:3001', changeOrigin: true },
    },
  },
});
