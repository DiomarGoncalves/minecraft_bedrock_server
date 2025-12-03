import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/server': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/worlds': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/addons': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/config': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
      },
    },
  },
});