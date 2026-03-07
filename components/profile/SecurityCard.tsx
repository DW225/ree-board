"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/utils/supabase/client";
import { PasswordSchema } from "@/lib/utils/validation/password";
import { ChevronDown, Shield } from "lucide-react";
import type { SubmitEvent } from "react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

function getStrength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  const labels = ["", "Weak", "Fair", "Good", "Strong", "Very Strong"];
  return { score, label: labels[score] ?? "Very Strong" };
}

const strengthColors = [
  "",
  "bg-red-400",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-500",
  "bg-green-600",
];

export function SecurityCard() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const supabaseRef = useRef(createClient());

  const strength = getStrength(newPassword);

  function resetForm() {
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const validation = PasswordSchema.safeParse(newPassword);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        const { error: updateError } =
          await supabaseRef.current.auth.updateUser({ password: newPassword });
        if (updateError) {
          setError(updateError.message);
          return;
        }
        toast.success("Password updated successfully");
        resetForm();
        setIsExpanded(false);
      } catch {
        setError("An unexpected error occurred");
      }
    });
  };

  return (
    <div
      id="security"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-6 py-5 text-left"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2.5">
          <Shield className="h-4 w-4 text-slate-500" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Password &amp; Security
            </p>
            <p className="text-sm text-slate-500">
              Manage your password and account security
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className="h-px bg-slate-200" />

      {isExpanded && (
        <>
          <form id="security-password-form" onSubmit={handleSubmit} className="space-y-4 p-6">
            <div className="space-y-1.5">
              <Label
                htmlFor="newPassword"
                className="text-sm text-slate-600"
              >
                New password
              </Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPassword"
                className="text-sm text-slate-600"
              >
                Confirm new password
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isPending}
                required
              />
            </div>

            {newPassword && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all ${strengthColors[strength.score]}`}
                      style={{ width: `${(strength.score / 5) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs text-slate-500">
                    {strength.label}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Min. 8 characters with uppercase, lowercase, digit, and
                  symbol
                </p>
              </div>
            )}

            {error && (
              <p className="rounded bg-red-50 p-2 text-sm text-red-600">
                {error}
              </p>
            )}
          </form>

          <div className="h-px bg-slate-200" />

          <div className="flex items-center justify-end px-6 py-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsExpanded(false);
                }}
                disabled={isPending}
                className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="security-password-form"
                disabled={isPending || !newPassword || !confirmPassword}
                className="rounded-lg bg-gradient-to-b from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
