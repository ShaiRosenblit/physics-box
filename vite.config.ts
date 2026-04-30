import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

declare const process: { env: Record<string, string | undefined> };

// `base: "./"` lets the build work both from `/` and from a subpath
// (Vercel/Netlify root, GitHub Pages project pages). Override via
// `BASE_PATH` env var when deploying to a fixed absolute prefix.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "./",
  build: {
    target: "es2020",
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
  },
  preview: {
    port: 4173,
    host: true,
  },
});
