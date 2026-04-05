import NavBar from "@/components/common/NavBar";
import { ProfileSkeleton } from "@/components/ui/skeletons";

/**
 * Loading skeleton for the profile page.
 * Shows the navigation bar immediately while the profile content loads.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <div className="mx-auto max-w-[1200px] px-12 py-8">
        <ProfileSkeleton />
      </div>
    </div>
  );
}
