import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const port = parseInt(execSync('python3 get-port.py').toString().trim());

export default defineConfig({
  server: {
    port,
    open: true,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  publicDir: 'public',
});
