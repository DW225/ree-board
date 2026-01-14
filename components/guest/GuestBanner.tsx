"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UpgradeAccountDialog } from "./UpgradeAccountDialog";
import { Clock } from "lucide-react";

interface GuestBannerProps {
  expiresAt: Date;
}

// Expiration warning thresholds (in days)
const URGENT_THRESHOLD_DAYS = 7;
const CRITICAL_THRESHOLD_DAYS = 3;

// Time conversion constant
const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Banner shown to guest users with expiration warning and upgrade CTA
 * Only visible to authenticated guest users
 */
export function GuestBanner({ expiresAt }: Readonly<GuestBannerProps>) {
  const [showDialog, setShowDialog] = useState(false);

  // Calculate days remaining
  const timeLeft = expiresAt.getTime() - Date.now();
  const daysLeft = Math.ceil(timeLeft / MS_PER_DAY);

  // Don't show banner if expired (shouldn't happen, but defensive)
  if (daysLeft <= 0) {
    return null;
  }

  // Determine banner urgency styling
  const isUrgent = daysLeft <= URGENT_THRESHOLD_DAYS;
  const isCritical = daysLeft <= CRITICAL_THRESHOLD_DAYS;

  // Helper functions to get urgency-based styles
  const getBannerStyles = () => {
    if (isCritical) {
      return "bg-red-50 border-red-200";
    }
    if (isUrgent) {
      return "bg-orange-50 border-orange-200";
    }
    return "bg-amber-50 border-amber-200";
  };

  const getIconStyles = () => {
    if (isCritical) {
      return "text-red-600";
    }
    if (isUrgent) {
      return "text-orange-600";
    }
    return "text-amber-600";
  };

  const getTextStyles = () => {
    if (isCritical) {
      return "text-red-900";
    }
    if (isUrgent) {
      return "text-orange-900";
    }
    return "text-amber-900";
  };

  const getButtonStyles = () => {
    if (isCritical) {
      return "bg-red-600 hover:bg-red-700";
    }
    if (isUrgent) {
      return "bg-orange-600 hover:bg-orange-700";
    }
    return "";
  };

  return (
    <>
      <div className={`border-b p-3 ${getBannerStyles()}`}>
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className={`size-4 ${getIconStyles()}`} />
            <p className={`text-sm ${getTextStyles()}`}>
              Guest account -{" "}
              <span className="font-semibold">
                {daysLeft === 1
                  ? "expires tomorrow"
                  : `${daysLeft} days remaining`}
              </span>
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowDialog(true)}
            className={getButtonStyles()}
          >
            Upgrade to Keep Access
          </Button>
        </div>
      </div>
      <UpgradeAccountDialog open={showDialog} onOpenChange={setShowDialog} />
    </>
  );
}