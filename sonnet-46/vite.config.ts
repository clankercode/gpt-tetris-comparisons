import { defineConfig } from 'vite';

// Port is injected via CLI: `vite --port $(python3 get-port.py)`
// This config sets up the base project without hardcoding a port.
export default defineConfig({
  base: './',
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
