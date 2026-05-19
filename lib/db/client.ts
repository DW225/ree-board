import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

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

const TRANSIENT_ERROR_PATTERNS = [
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "ENOTFOUND",
  "socket hang up",
  "network error",
];

export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toUpperCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) =>
    msg.includes(pattern.toUpperCase()),
  );
}

const DB_MAX_RETRIES = 3;
const DB_INITIAL_DELAY_MS = 500;

export async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  let delay = DB_INITIAL_DELAY_MS;

  for (let attempt = 1; attempt <= DB_MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isTransientError(error) || attempt === DB_MAX_RETRIES) {
        throw error;
      }
      console.warn(
        `DB operation failed (attempt ${attempt}/${DB_MAX_RETRIES}). Retrying in ${delay}ms...`,
        error instanceof Error ? error.message : error,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("DB retry attempts exhausted");
}
