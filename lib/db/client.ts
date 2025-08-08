import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const dbUrl =
  process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:8080"
    : process.env.TURSO_DATABASE_URL!;

if (dbUrl == undefined) {
  throw new Error("Missing TURSO_DATABASE_URL environment variable");
}
const dbAuthToken =
  process.env.NODE_ENV === "development"
    ? undefined
    : process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url: dbUrl,
  authToken: dbAuthToken,
});

export const db = drizzle(client);
