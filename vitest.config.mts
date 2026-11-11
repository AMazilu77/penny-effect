// Vitest configuration. Run tests with `pnpm test` (or `pnpm test:watch`).
// Docs: https://vitest.dev/config/
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Same "@/..." import alias as tsconfig.json, so tests can import app code.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Business-logic tests run in plain Node; no browser needed.
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
