/**
 * Vite configuration.
 *
 * The dev proxy mirrors what nginx does in the production image: the client
 * always calls `/api/...` on its own origin, and something in front forwards
 * that to the API. Because the two environments agree, there is no base URL to
 * configure, no CORS to think about, and no build-time environment variable
 * that could be wrong.
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': {
        // `localhost` when running `npm run dev` outside Docker; override with
        // VITE_API_TARGET when running the dev server inside the compose network.
        target: process.env.VITE_API_TARGET ?? 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
