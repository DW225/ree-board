"use client";

import { useState } from "react";
import { upgradeGuestAccount, verifyGuestUpgradeOTP } from "@/lib/actions/guest/action";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface UpgradeAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog for upgrading a guest account to a full account
 * Two-step process: email submission → OTP verification + name input
 */
export function UpgradeAccountDialog({
  open,
  onOpenChange,
}: Readonly<UpgradeAccountDialogProps>) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Reset state when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEmail("");
      setName("");
      setOtp("");
      setNeedsOtp(false);
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await upgradeGuestAccount(email);

      if (result.success && result.needsOtp) {
        setNeedsOtp(true);
        toast.success("Verification code sent to your email");
      } else {
        setError(result.error || "Failed to send verification code");
        toast.error(result.error || "Failed to send verification code");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Client-side name validation
  const validateName = (value: string): string | null => {
    if (!value || value.trim().length === 0) {
      return "Name is required";
    }
    if (value.length > 50) {
      return "Name must be less than 50 characters";
    }
    if (!/^[a-zA-Z0-9_\- ]+$/.test(value)) {
      return "Name can only contain letters, numbers, spaces, underscores, and hyphens";
    }
    return null;
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validate name before submitting
    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      setLoading(false);
      return;
    }

    try {
      const result = await verifyGuestUpgradeOTP(email, otp, name);

      if (result.success) {
        toast.success("Account upgraded successfully!");
        onOpenChange(false);
        // Reload to update UI with new auth state
        globalThis.location.reload();
      } else {
        setError(result.error || "Invalid verification code");
        toast.error(result.error || "Invalid verification code");
      }
    } catch (error) {
      console.error("Error verifying OTP:", error);
      setError("An unexpected error occurred. Please try again.");
      toast.error("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 1: Email input only
  if (!needsOtp) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade Your Account</DialogTitle>
            <DialogDescription>
              Keep your access to all boards permanently. We'll send you a
              verification code to confirm your email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                "Send Verification Code"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Step 2: OTP + Name input
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verify Your Email</DialogTitle>
          <DialogDescription>
            We sent a 6-digit code to <strong>{email}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replaceAll(/\D/g, ""))}
              placeholder="123456"
              maxLength={6}
              required
              disabled={loading}
              autoFocus
              className="text-center text-2xl tracking-widest"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the 6-digit code from your email
            </p>
          </div>
          <div>
            <Label htmlFor="name">Display Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Letters, numbers, spaces, underscores, and hyphens only
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="space-y-2">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Upgrade Account"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                // Go back to step 1 if user made a mistake with email
                setNeedsOtp(false);
                setOtp("");
                setName("");
                setError("");
              }}
              disabled={loading}
              className="w-full"
            >
              Use Different Email
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
