"use client";

import { Trash2, TriangleAlert } from "lucide-react";

interface Props {
  userId: string;
}

export function DangerZoneCard({ userId: _userId }: Readonly<Props>) {

  return (
    <div className="rounded-xl border border-red-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 py-4">
        <TriangleAlert className="h-4 w-4 text-red-500" />
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Danger Zone</h2>
          <p className="text-sm text-slate-500">
            Irreversible and destructive actions
          </p>
        </div>
      </div>
      <div className="h-px bg-red-100" />

      {/* Body */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-sm font-medium text-slate-800">Delete account</p>
          <p className="text-xs text-slate-500">
            Permanently delete your account and all associated data. You cannot
            undo this.
          </p>
        </div>
        <button
          disabled
          title="Coming soon"
          className="ml-4 flex shrink-0 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 opacity-50 cursor-not-allowed"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete account
        </button>
      </div>
    </div>
  );
}
