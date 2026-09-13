import NavBar from "@/components/common/NavBar";
import { GuestBanner } from "@/components/guest/GuestBanner";
import { verifySession } from "@/lib/dal";
import { getUserByUserID } from "@/lib/db/user";
import type { ReactNode } from "react";

export default async function Layout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await verifySession();
  const guest = session.isGuest ? await getUserByUserID(session.userId) : null;
  return (
    <>
      <NavBar />
      {session.isGuest && (
        <GuestBanner expiresAt={guest?.guestExpiresAt ?? null} />
      )}
      {children}
    </>
  );
}
