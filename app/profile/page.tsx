import NavBar from "@/components/common/NavBar";
import { AccountStatsCard } from "@/components/profile/AccountStatsCard";
// import { ConnectedAppsCard } from "@/components/profile/ConnectedAppsCard"; // TODO: enable when OIDC is supported
import { DangerZoneCard } from "@/components/profile/DangerZoneCard";
import { PersonalInfoCard } from "@/components/profile/PersonalInfoCard";
import { PlanCard } from "@/components/profile/PlanCard";
import { ProfileHero } from "@/components/profile/ProfileHero";
import { SecurityCard } from "@/components/profile/SecurityCard";
import { Role } from "@/lib/constants/role";
import { getCurrentUser, verifySession } from "@/lib/dal";
import { fetchBoards } from "@/lib/db/board";
import { getUserByUserID } from "@/lib/db/user";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description: "View and manage your profile settings",
};

export default async function ProfilePage() {
  const [session, supabaseUser] = await Promise.all([
    verifySession(),
    getCurrentUser(),
  ]);
  const { userId } = session;

  const [internalUser, boards] = await Promise.all([
    getUserByUserID(userId),
    fetchBoards(userId),
  ]);

  const rawFullName = supabaseUser.user_metadata?.full_name;
  const fullName =
    (typeof rawFullName === "string" ? rawFullName : undefined) ??
    supabaseUser.email?.split("@")[0] ??
    "User";
  const rawDisplayName = supabaseUser.user_metadata?.display_name;
  const displayName =
    (typeof rawDisplayName === "string" ? rawDisplayName : undefined) ??
    fullName;
  const email = supabaseUser.email ?? "";

  const initials =
    fullName
      .split(" ")
      .map((n: string) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || email.slice(0, 2).toUpperCase();

  const ownedBoardCount = boards.filter((b) => b.role === Role.owner).length;
  const memberBoardCount = boards.length - ownedBoardCount;
  const memberSince = internalUser?.createdAt ?? null;

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <ProfileHero initials={initials} fullName={fullName} email={email} />
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 sm:px-6 lg:flex-row lg:px-12">
        <div className="flex flex-1 flex-col gap-5">
          <PersonalInfoCard
            fullName={fullName}
            displayName={displayName}
            email={email}
          />
          <SecurityCard />
          {/* <ConnectedAppsCard /> */}
          <DangerZoneCard userId={userId} />
        </div>
        <div className="flex w-full flex-shrink-0 flex-col gap-4 lg:w-72">
          <AccountStatsCard
            ownedBoardCount={ownedBoardCount}
            memberBoardCount={memberBoardCount}
            memberSince={memberSince}
          />
          <PlanCard />
        </div>
      </div>
    </div>
  );
}
