import { defineConfig } from "drizzle-kit";
import { validateLocalE2e } from "./lib/config/localE2e";

import "./envConfig";

function databaseSettings() {
  const localE2e = validateLocalE2e();
  if (localE2e) return { dbCredentials: { url: localE2e.libsqlOrigin } };
  if (process.env.NODE_ENV === "development") {
    return { dbCredentials: { url: "file:test.db" }, verbose: true };
  }
  return {
    dbCredentials: {
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    },
  };
}

export default defineConfig({
  dialect: "turso",
  schema: "./db/schema.ts",
  out: "./drizzle",
  ...databaseSettings(),
});
