import NavBar from "@/components/common/NavBar";
import { ProfileSkeleton } from "@/components/ui/skeletons";

/**
 * Loading skeleton for the profile page.
 * Shows the navigation bar immediately while the profile content loads.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-gray-100">
      <NavBar />
      <div className="container mx-auto p-4 flex">
        <div className="flex-1">
          <ProfileSkeleton />
        </div>
      </div>
    </div>
  );
}
