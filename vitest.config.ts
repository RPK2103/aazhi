import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": path.resolve(
        fileURLToPath(new URL(".", import.meta.url)),
        "src/test-support/server-only-stub.ts",
      ),
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
        "src/app/api/risk/**/*.ts",
        "src/application/active-trip/**/*.ts",
        "src/application/coordinator-attention/**/*.ts",
        "src/application/marine-risk/**/*.ts",
        "src/application/persistence/**/*.ts",
        "src/application/risk-orchestrator/**/*.ts",
        "src/application/vessel-risk-record/**/*.ts",
        "src/domain/risk/**/*.ts",
        "src/domain/policy/**/*.ts",
        "src/domain/safety/**/*.ts",
        "src/data/safety/**/*.ts",
        "src/evals/**/*.ts",
        "src/infrastructure/persistence/prisma/persistence-mappers.ts",
        "src/lib/active-trip-display.ts",
        "src/lib/coordinator-display.ts",
        "src/lib/active-trip-storage.ts",
        "src/lib/ai/**/*.ts",
        "src/lib/marine-normalize.ts",
        "src/lib/fetch-marine-context.ts",
        "src/lib/gemini-parse.ts",
        "src/lib/generate-assessment.ts",
        "src/lib/validation.ts",
        "src/server/risk-intelligence/**/*.ts",
      ],
      exclude: ["src/**/*.test.ts"],
    },
  },
});
