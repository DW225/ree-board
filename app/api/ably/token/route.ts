import { getUserBySupabaseId } from "@/lib/db/user";
import { createClient } from "@/lib/utils/supabase/server";
import Ably from "ably";
import { NextResponse } from "next/server";

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

    const ablyAPIKey = process.env.ABLY_API_KEY;
    if (!ablyAPIKey) {
      throw new Error("ABLY_API_KEY environment variable is not set");
    }

    const client = new Ably.Rest({ key: ablyAPIKey });
    const tokenRequestData = await client.auth.createTokenRequest({
      capability: { "*": ["subscribe"] },
      clientId: internalUser.id,
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
