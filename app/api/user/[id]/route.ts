import { getUserByUserID } from "@/lib/db/user";
import { md5 } from "@/lib/utils/md5";
import { createClient } from "@/lib/utils/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const revalidate = 3600;

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
      { status: 503 }
    );
  }

  if (!authUser) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const userID = params.id;
  if (!userID) {
    return NextResponse.json(
      { message: "User ID is required" },
      { status: 400 }
    );
  }

  const user = await getUserByUserID(userID);
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }

  const userPublicInfo = {
    name: user.name,
    email: user.email,
    avatar_url: `https://www.gravatar.com/avatar/${md5(
      (user?.email ?? "").trim().toLowerCase()
    )}`,
  };

  return NextResponse.json({ user: userPublicInfo });
}
