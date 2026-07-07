import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

function ignoreSocketResetErrors(): Plugin {
  return {
    name: "ignore-socket-reset-errors",
    configureServer(server) {
      server.httpServer?.on("connection", (socket) => {
        socket.on("error", (error: NodeJS.ErrnoException) => {
          if (error.code === "ECONNRESET" || error.code === "ECONNABORTED") {
            return;
          }

          server.config.logger.error(error.stack || error.message);
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), ignoreSocketResetErrors()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    hmr: {
      host: "127.0.0.1",
      protocol: "ws",
      port: 5173,
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
