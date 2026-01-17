import { createUser, deleteUser } from "@/lib/db/user";
import { getKindeUser } from "@/lib/utils/kinde";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";

// The Kinde issuer URL should already be in your `.env` file
// from when you initially set up Kinde. This will fetch your
// public JSON web keys file
const client = jwksClient({
  jwksUri: `${process.env.KINDE_ISSUER_URL}/.well-known/jwks.json`,
});

type KindeUserEventData = {
  authorization: { org_code: string };
  user: { id: string };
};

export async function POST(req: Request) {
  try {
    // Get the token from the request
    const token = await req.text();

    // Decode the token
    const decodedToken = jwt.decode(token, { complete: true });
    if (decodedToken == null) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 });
    }
    const { header } = decodedToken;
    const { kid } = header;

    // Verify the token
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    const event = jwt.verify(token, signingKey) as {
      type: string;
      data: KindeUserEventData;
    };

    const createNewUser = async () => {
      const kindUser = await getKindeUser(event.data.user.id);
      if (!kindUser) {
        return new Error("Failed to fetch Kinde user");
      }

      const userID = nanoid();
      await createUser({
        id: userID,
        // kinde_id: event.data.user.id,
        name: kindUser.username ?? `User_${userID}`,
        email:
          kindUser.preferred_email ?? `user_${event.data.user.id}@kinde.com`,
        supabase_id: userID,
      });
      console.log(`Created new user ${event.data.user.id}`);
    };

    switch (event?.type) {
      case "user.authenticated": {
        // const user = await getUserByKindeID(event.data.user.id);
        // if (!user) {
        //   await createNewUser();
        // }
        // break;
      }
      case "user.created":
        await createNewUser();
        break;
      case "user.deleted":
        await deleteUser(event.data.user.id).catch((err) =>
          console.error(`Error deleting user ${event.data.user.id}:`, err)
        );
        break;
      default:
        // other events that we don't handle
        break;
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
      return NextResponse.json({ message: err.message }, { status: 400 });
    }
  }
  return NextResponse.json({ status: 200, statusText: "success" });
}
