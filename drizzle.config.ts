import { defineConfig } from "drizzle-kit";
import { validateLocalE2e } from "./lib/config/localE2e";

import "./envConfig";

const localE2e = validateLocalE2e();
export default defineConfig(
  localE2e
    ? {
        dialect: "turso",
        schema: "./db/schema.ts",
        out: "./drizzle",
        dbCredentials: { url: localE2e.libsqlOrigin },
      }
    : process.env.NODE_ENV === "development"
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
