import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Vitest configuration. Two projects so server tests run in node while
// client/UI tests run in jsdom (React Testing Library needs a DOM).
// Run with `npm test` (or `bash scripts/run-tests.sh`).
//
// Projects:
//   - server: server/__tests__ and shared tests in node env (no plugins
//             so import.meta.url stays a real file URL).
//   - client: client/src tests in jsdom with the React plugin for JSX.
export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            "@shared": path.resolve(import.meta.dirname, "shared"),
          },
        },
        test: {
          name: "server",
          root: path.resolve(import.meta.dirname),
          include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            "@": path.resolve(import.meta.dirname, "client", "src"),
            "@shared": path.resolve(import.meta.dirname, "shared"),
            "@assets": path.resolve(import.meta.dirname, "attached_assets"),
          },
        },
        test: {
          name: "client",
          root: path.resolve(import.meta.dirname),
          include: ["client/src/**/*.test.tsx", "client/src/**/*.test.ts"],
          environment: "jsdom",
          globals: true,
          setupFiles: ["client/src/test/setup.ts"],
        },
      },
    ],
  },
});
