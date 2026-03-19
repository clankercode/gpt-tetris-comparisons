import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Port is injected via CLI: `vite --port $(python3 get-port.py)`
// This config sets up the base project without hardcoding a port.
export default defineConfig({
  server: {
    open: true,
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
});
