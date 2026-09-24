import { captureRequestError } from "@sentry/nextjs";

export async function register() {
  if (process.env.APP_ENV === "local-e2e") return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = captureRequestError;
