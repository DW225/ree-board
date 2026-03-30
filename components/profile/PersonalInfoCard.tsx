"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/utils/supabase/client";
import { Edit2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";

interface Props {
  fullName: string;
  displayName: string;
  email: string;
}

export function PersonalInfoCard({
  fullName: initialFullName,
  displayName: initialDisplayName,
  email,
}: Readonly<Props>) {
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(initialFullName);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [isPending, startTransition] = useTransition();
  const supabaseRef = useRef(createClient());
  const router = useRouter();

  const handleSave = () => {
    startTransition(async () => {
      try {
        const { error } = await supabaseRef.current.auth.updateUser({
          data: { full_name: fullName, display_name: displayName },
        });
        if (error) {
          toast.error("Failed to update profile");
          return;
        }
        toast.success("Profile updated");
        setIsEditing(false);
        router.refresh();
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  };

  const handleCancel = () => {
    setFullName(initialFullName);
    setDisplayName(initialDisplayName);
    setIsEditing(false);
  };

  return (
    <div
      id="profile"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-start justify-between px-6 py-5">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">
            Personal Information
          </h2>
          <p className="text-sm text-slate-500">
            Update your name, email, and display preferences
          </p>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            <Edit2 className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <div className="h-px bg-slate-200" />

      {/* Body */}
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm text-slate-600">
              Full name
            </Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={!isEditing || isPending}
              className="disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm text-slate-600">
              Email address
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              disabled
              className="cursor-default bg-slate-50 text-slate-500"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="displayName" className="text-sm text-slate-600">
            Display name
          </Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={!isEditing || isPending}
            className="disabled:cursor-default disabled:bg-slate-50 disabled:text-slate-700"
          />
        </div>
      </div>

      {/* Footer (only when editing) */}
      {isEditing && (
        <>
          <div className="h-px bg-slate-200" />
          <div className="flex justify-end gap-2 px-6 py-4">
            <button
              onClick={handleCancel}
              disabled={isPending}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-lg bg-gradient-to-b from-indigo-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
