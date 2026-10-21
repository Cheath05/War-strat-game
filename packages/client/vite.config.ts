import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The dev server proxies the relay (WebSocket + room API) to the Node host on 8090,
// so the browser talks to one origin in development just as it does in production.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5190,
    strictPort: true,
    host: true,
    proxy: {
      '/api': 'http://127.0.0.1:8090',
      '/ws': { target: 'ws://127.0.0.1:8090', ws: true },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 2000,
  },
});
