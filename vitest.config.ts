import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Standalone Vitest config so the test runner does not inherit `vite.config.ts`
 * (which sets `root: client/` for the frontend build). Tests live alongside
 * the server code and resolve `@shared/*` against the shared schema.
 */
export default defineConfig({
  test: {
    root: path.resolve(import.meta.dirname),
    include: ["server/**/*.test.ts", "shared/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    alias: {
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
});
