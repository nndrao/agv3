import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      'lucide-react',
      'ag-grid-community',
      'ag-grid-enterprise',
      'ag-grid-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-toast'
    ],
    force: true, // Force re-optimization
  },
  server: {
    host: true,
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        'provider-window': path.resolve(__dirname, 'public/provider-window.html'),
        'provider': path.resolve(__dirname, 'public/provider.html'),
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'ag-grid': ['ag-grid-community', 'ag-grid-enterprise', 'ag-grid-react'],
          'ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-toast'],
          'icons': ['lucide-react', '@radix-ui/react-icons'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
