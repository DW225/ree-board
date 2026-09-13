import { getUserBySupabaseId } from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import Ably from "ably";
import { NextResponse } from "next/server";
import { memberTable } from "@/db/schema";
import { db } from "@/lib/db/client";
import { Role } from "@/lib/constants/role";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

const boardIdSchema = z
  .string()
  .min(1)
  .refine((id) => !/[^A-Za-z0-9_-]/.test(id));

// ensure Vercel doesn't cache the result of this route,
// as otherwise the token request data will eventually become outdated
// and we won't be able to authenticate on the client side
export const revalidate = 0;

export async function POST() {
  try {
    // Verify session (can't use verifySession() from DAL - redirect() doesn't work in API routes)
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Error getting user from Supabase:", error.message);
      return NextResponse.json(
        { error: "Auth service unavailable" },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    // Look up internal user
    const internalUser = await getUserBySupabaseId(user.id);
    if (!internalUser) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const memberships = await db
      .select({ boardId: memberTable.boardId })
      .from(memberTable)
      .where(
        and(
          eq(memberTable.userId, internalUser.id),
          inArray(memberTable.role, [Role.owner, Role.member, Role.guest])
        )
      );
    const capability: Record<string, ["subscribe"]> = {};
    for (const membership of memberships) {
      const boardId = boardIdSchema.safeParse(membership.boardId);
      if (boardId.success) capability[`board:${boardId.data}`] = ["subscribe"];
    }
    // Never omit capability: Ably would inherit all permissions from the API key.
    if (Object.keys(capability).length === 0) {
      return NextResponse.json(
        { error: "No authorized boards" },
        { status: 403 }
      );
    }

    const ablyAPIKey = process.env.ABLY_API_KEY;
    if (!ablyAPIKey) {
      throw new Error("ABLY_API_KEY environment variable is not set");
    }

    const client = new Ably.Rest({ key: ablyAPIKey });
    const tokenRequestData = await client.auth.createTokenRequest({
      capability,
      clientId: internalUser.id,
      // Removed memberships lose access when this short-lived token expires.
      ttl: 60_000,
    });
    return Response.json(tokenRequestData);
  } catch (error) {
    console.error("Failed to generate Ably token:", error);
    return Response.json(
      { error: "Failed to generate Ably token" },
      { status: 500 }
    );
  }
}
