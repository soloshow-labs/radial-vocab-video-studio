import {defineConfig} from "vite";
import react from "@vitejs/plugin-react";

const ANTI_FRAMING_HEADERS = {
  "Content-Security-Policy": "frame-ancestors 'none'",
  "X-Frame-Options": "DENY",
};

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    headers: ANTI_FRAMING_HEADERS,
    proxy: {
      "/api": "http://127.0.0.1:4317",
    },
  },
  preview: {
    headers: ANTI_FRAMING_HEADERS,
  },
});
