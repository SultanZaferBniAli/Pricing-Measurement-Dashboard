import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/*
 * The deployed build is a GitHub Pages project site, served from
 * /Pricing-Measurement-Dashboard/ rather than the domain root, so the built
 * asset URLs have to carry that prefix. Dev keeps serving from "/" so the
 * localhost URL stays plain.
 */
const REPO_BASE = "/Pricing-Measurement-Dashboard/";

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  base: command === "build" ? REPO_BASE : "/",
  plugins: [react()],
  server: {
    port: 5183,
    host: true,
  },
}));
