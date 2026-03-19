import { defineConfig } from 'vite';
import { execSync } from 'child_process';

export default defineConfig(({ command }) => {
  const server =
    command === 'serve'
      ? {
          port: parseInt(execSync('python3 get-port.py').toString().trim(), 10),
          open: true,
        }
      : undefined;

  return {
    base: './',
    server,
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
  };
});
