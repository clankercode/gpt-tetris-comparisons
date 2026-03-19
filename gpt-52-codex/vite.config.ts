import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const port = Number(env.VITE_PORT || 5173);

  return {
    base: "./",
    server: {
      port,
      strictPort: true
    }
  };
});
