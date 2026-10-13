import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// In development the browser talks to Vite (port 5173), and Vite forwards /api calls to FastAPI.
// This avoids CORS problems and means the frontend needs no extra configuration.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
