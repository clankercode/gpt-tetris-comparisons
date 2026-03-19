import { defineConfig } from 'vite';

export default defineConfig({
  base: '/gpt-tetris-comparisons/minimax-25/',
  root: '.',
  publicDir: 'public',
  server: {
    port: 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
