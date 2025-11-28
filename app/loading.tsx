import { FullPageSpinner } from "@/components/ui/skeletons";

/**
 * Root-level loading state.
 * Displays a full-page spinner while the main application loads.
 */
export default function Loading() {
  return <FullPageSpinner />;
}
