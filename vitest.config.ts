import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "src/app/api/assess/route.ts",
        "src/domain/risk/**/*.ts",
        "src/evals/**/*.ts",
        "src/lib/ai/**/*.ts",
        "src/lib/gemini.ts",
        "src/lib/locations.ts",
        "src/lib/marine.ts",
        "src/lib/validation.ts",
      ],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
