"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/utils/supabase/client";
import { PasswordSchema } from "@/lib/utils/validation/password";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

export function ChangePasswordSection() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const supabaseRef = useRef(createClient());

  function resetForm(): void {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    const validation = PasswordSchema.safeParse(newPassword);
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    startTransition(async () => {
      try {
        // Verify current password by re-authenticating
        const {
          data: { user },
        } = await supabaseRef.current.auth.getUser();

        if (!user?.email) {
          setError("User not found");
          return;
        }

        const { error: signInError } = await supabaseRef.current.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        });

        if (signInError) {
          setError("Current password is incorrect");
          return;
        }

        // Update password
        const { error: updateError } = await supabaseRef.current.auth.updateUser({
          password: newPassword,
        });

        if (updateError) {
          setError(updateError.message);
          return;
        }

        // Success
        toast.success("Password updated successfully");
        resetForm();
        setIsExpanded(false);
      } catch (err) {
        console.error("Error changing password:", err);
        setError("An unexpected error occurred");
      }
    });
  };

  function handleCancel(): void {
    resetForm();
    setIsExpanded(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-slate-600" />
            <div>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Manage your account security settings
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
            aria-label={
              isExpanded ? "Collapse password form" : "Expand password form"
            }
          >
            {isExpanded ? (
              <>
                Cancel <ChevronUp className="ml-2 h-4 w-4" />
              </>
            ) : (
              <>
                Change Password <ChevronDown className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                disabled={isPending}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </p>
            )}

            <p className="text-xs text-slate-500">
              Password must be at least 8 characters with lowercase, uppercase,
              digit, and symbol.
            </p>

            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={
                  isPending ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
              >
                {isPending ? "Updating..." : "Update Password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isPending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}