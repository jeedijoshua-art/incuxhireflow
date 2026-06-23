import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Resume parsing → resume-analyzer (port 5175)
      "/api/resume": "http://localhost:5175",
      // Interview, transcription, feedback → interview-engine (port 5174)
      "/api": "http://localhost:5174",
    },
  },
});
