import { cleanupExpiredGuestUsers } from "@/lib/jobs/cleanupGuestUsers";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

/**
 * Cron endpoint to cleanup expired guest users
 *
 * This endpoint is triggered by Vercel Cron Jobs daily at 2am UTC.
 * It removes guest users whose 30-day expiration period has passed.
 *
 * SECURITY:
 * - Protected by CRON_SECRET environment variable
 * - Only accepts requests with valid Bearer token
 * - Intended to be called by Vercel Cron system
 *
 * CONFIGURATION:
 * - Schedule: 0 2 * * * (daily at 2am UTC)
 * - Configured in vercel.json
 *
 * @param request - Next.js request object
 * @returns JSON response with cleanup results
 */
export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (!process.env.CRON_SECRET) {
    console.error(
      "[Cron Cleanup] CRON_SECRET environment variable is not configured"
    );
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const isValidAuth =
    authHeader?.length === expectedAuth.length &&
    timingSafeEqual(Buffer.from(authHeader || ""), Buffer.from(expectedAuth));

  if (!isValidAuth) {
    console.warn("[Cron Cleanup] Unauthorized access attempt");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("[Cron Cleanup] Starting scheduled guest cleanup job");

    const deletedCount = await cleanupExpiredGuestUsers();

    // Extract pluralization logic to avoid nested ternary
    const pluralSuffix = deletedCount === 1 ? "" : "s";
    const successMessage = `Successfully deleted ${deletedCount} expired guest user${pluralSuffix}`;

    const response = {
      success: true,
      cleanedUp: deletedCount,
      timestamp: new Date().toISOString(),
      message:
        deletedCount > 0 ? successMessage : "No expired guests to clean up",
    };

    console.log("[Cron Cleanup] Job completed successfully:", response);

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("[Cron Cleanup] Job failed with error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      {
        success: false,
        error: "Cleanup failed",
        details: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
