import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  root: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, '../admin-build'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_ORIGIN || 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
});
