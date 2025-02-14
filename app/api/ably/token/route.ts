import { findUserIdByKindeID } from "@/lib/db/user";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import Ably from "ably";
import { NextResponse } from "next/server";

// ensure Vercel doesn't cache the result of this route,
// as otherwise the token request data will eventually become outdated
// and we won't be able to authenticate on the client side
export const revalidate = 0;

export async function POST() {
  try {
    const { getUser, isAuthenticated } = getKindeServerSession();
    if (!(await isAuthenticated())) {
      return NextResponse.redirect("/api/auth/login");
    }

    const kindeUser = await getUser();

    if (!kindeUser) {
      console.error("Unable to fetch Kinde user");
      return NextResponse.json(
        { error: "Unable to fetch Kinde user" },
        { status: 500 }
      );
    }

    const userId = await findUserIdByKindeID(kindeUser.id);

    if (!userId) {
      console.error("Unable to find matching user in the database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const ablyAPIKey = process.env.ABLY_API_KEY;
    if (!ablyAPIKey) {
      throw new Error("ABLY_API_KEY environment variable is not set");
    }

    const client = new Ably.Rest({ key: ablyAPIKey });
    const tokenRequestData = await client.auth.createTokenRequest({
      capability: { "*": ["subscribe"] },
      clientId: userId,
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
