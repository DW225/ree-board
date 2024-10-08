import { defineConfig } from "drizzle-kit";

import "./envConfig";

export default defineConfig(
  process.env.NODE_ENV === "development"
    ? {
        dialect: "turso",
        schema: "./db/schema.ts",
        out: "./drizzle",
        dbCredentials: {
          url: "file:test.db",
        },
        verbose: true,
      }
    : {
        dialect: "turso",
        schema: "./db/schema.ts",
        out: "./drizzle",
        dbCredentials: {
          url: process.env.TURSO_DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
);
