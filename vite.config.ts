import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * Dev: Vite serves the app on 5183 and proxies /api to the Node API on 8787.
 * Production: the API serves the built dist/ itself, from "/".
 */
export default defineConfig(() => ({
  base: "/",
  plugins: [react()],
  server: {
    port: 5183,
    host: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? 8787}`,
        changeOrigin: false,
      },
    },
  },
}));
