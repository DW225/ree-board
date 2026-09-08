import { MS_PER_HOUR, MS_PER_MINUTE } from "@/lib/constants/time";

/**
 * Helper to format time unit with proper pluralization
 */
function formatTimeUnit(value: number, unit: string): string {
  return `${value} ${unit}${value > 1 ? "s" : ""}`;
}

/**
 * Helper to calculate time units from milliseconds
 */
function calculateTimeUnits(milliseconds: number) {
  const minutes = Math.floor(milliseconds / MS_PER_MINUTE);
  const hours = Math.floor(milliseconds / MS_PER_HOUR);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);

  return { months, weeks, days, hours, minutes };
}

/**
 * Helper function to calculate human-readable time until expiration
 */
export function getTimeUntilExpiration(expiresAt: Date | string | null, now = Date.now()): string {
  if (!expiresAt) {
    return "never";
  }

  const timeLeft = new Date(expiresAt).getTime() - now;

  if (timeLeft <= 0) {
    return "expired";
  }

  const { months, weeks, days, hours, minutes } = calculateTimeUnits(timeLeft);

  if (months > 0) return formatTimeUnit(months, "month");
  if (weeks > 0) return formatTimeUnit(weeks, "week");
  if (days > 0) return formatTimeUnit(days, "day");
  if (hours > 0) return formatTimeUnit(hours, "hour");
  if (minutes > 0) return formatTimeUnit(minutes, "minute");

  return "less than a minute";
}

