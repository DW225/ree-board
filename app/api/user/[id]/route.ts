import { getVisibleUserProfile } from "@/lib/db/user";
import { md5 } from "@/lib/utils/md5";
import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const userIdSchema = z.string().trim().min(1);

// Get /api/user/:id
// Returns user public info for the given user ID
export async function GET(
  _: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  // Verify session (can't use verifySession() from DAL - redirect() doesn't work in API routes)
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("Error getting user from Supabase:", error.message);
    return NextResponse.json(
      { error: "Auth service unavailable" },
      { status: 503, headers }
    );
  }

  if (!authUser) {
    return NextResponse.json(
      { error: "Unauthenticated" },
      { status: 401, headers }
    );
  }

  const userID = userIdSchema.safeParse(params.id);
  if (!userID.success) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400, headers }
    );
  }

  const user = await getVisibleUserProfile(userID.data, authUser.id);
  if (!user) {
    return NextResponse.json(
      { message: "User not found" },
      { status: 404, headers }
    );
  }

  const userPublicInfo = {
    name: user.name,
    avatar_url: `https://www.gravatar.com/avatar/${md5(
      (user?.email ?? "").trim().toLowerCase()
    )}`,
  };

  return NextResponse.json({ user: userPublicInfo }, { headers });
}
