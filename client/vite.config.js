import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'], // Add this line
  },
  server: {
    port: 5173,
    strictPort: true, // optional: ensures Vite won't switch port
    proxy: {
      '/api': 'http://localhost:5000',
    },
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
  },
});