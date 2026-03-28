"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMagicLinks } from "@/hooks/useMagicLinks";
import { Role } from "@/lib/constants/role";
import type { Board } from "@/lib/types/board";
import type { LinkWithCreator } from "@/lib/types/link";
import { EXPIRATION_OPTIONS } from "@/lib/types/link";
import { getRoleDisplayName } from "@/lib/utils/role";
import { cn } from "@/lib/utils";
import {
  Check,
  Copy,
  Eye,
  Info,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  Timer,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface LinkButtonProps {
  boardId: Board["id"];
  className?: string;
}

/**
 * A button that opens a unified V2 modal for managing magic invite links.
 * Consolidates creation and management into a single cohesive experience.
 * Only rendered for board owners.
 *
 * @param boardId - The ID of the board for which to manage links
 * @param className - Optional CSS class names for the trigger button
 */
export default function LinkButton({
  boardId,
  className,
}: Readonly<LinkButtonProps>) {
  const [isOpen, setIsOpen] = useState(false);
  const [role, setRole] = useState<Role.member | Role.guest>(Role.member);
  const [expirationHours, setExpirationHours] = useState<number>(168);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [linkToRevoke, setLinkToRevoke] = useState<LinkWithCreator | null>(
    null,
  );
  const [isRevoking, setIsRevoking] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const {
    activeLinks,
    expiredLinks,
    isLoading,
    createLink,
    revokeLink,
    copyLinkToClipboard,
    getLinkUrl,
  } = useMagicLinks(boardId);

  const handleCreateLink = async () => {
    setIsCreating(true);
    try {
      await createLink({ role, expirationHours });
      toast.success("Magic link created!");
    } catch {
      // Error toast is handled in the hook
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    try {
      await copyLinkToClipboard(token);
      setCopiedToken(token);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedToken(null), 2000);
    } catch {
      // Error toast is handled in the hook
    }
  };

  const handleRevoke = async () => {
    if (!linkToRevoke) return;
    setIsRevoking(true);
    try {
      await revokeLink(linkToRevoke.id);
      setLinkToRevoke(null);
    } catch {
      // Error toast is handled in the hook
    } finally {
      setIsRevoking(false);
    }
  };

  const hasNoLinks = activeLinks.length === 0 && expiredLinks.length === 0;
  const linkSections = [
    { title: "Active links", links: activeLinks, isExpired: false },
    { title: "Expired links", links: expiredLinks, isExpired: true },
  ].filter((section) => section.links.length > 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn("gap-1", className)}
            aria-label="Open invite link manager"
          >
            <Link2 className="h-4 w-4" />
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[520px] p-0 gap-0 rounded-xl border border-[#E2E8F0] shadow-lg overflow-hidden flex flex-col max-h-[85vh]">
          {/* Visually hidden description for screen readers */}
          <DialogDescription className="sr-only">
            Manage magic invite links for this board. Create a link to let
            anyone join without a direct invitation, or revoke existing links.
          </DialogDescription>

          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-[#E2E8F0]">
            <div>
              <DialogTitle className="text-lg font-bold text-[#0F172A] leading-tight">
                Invite Link
              </DialogTitle>
              <p className="text-sm text-[#64748B] mt-1 leading-relaxed">
                Share a magic link so others can join this board without an
                invitation.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex flex-col gap-5 p-6 flex-1 overflow-y-auto min-h-0">
            {/* Loading state */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#94A3B8]" />
              </div>
            )}

            {/* Empty state OR Active link card */}
            {!isLoading && (
              <>
                {hasNoLinks ? (
                  /* Empty state card */
                  <div className="rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] p-8 flex flex-col items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-[#F1F5F9] flex items-center justify-center">
                      <Link2Off className="w-6 h-6 text-[#94A3B8]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[15px] font-semibold text-[#0F172A]">
                        No active magic link
                      </p>
                      <p className="text-[13px] text-[#64748B] leading-relaxed mt-1">
                        Create a magic link to let anyone join this board with a
                        single click — no account required.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4">
                    {linkSections.map((section) => (
                      <div key={section.title} className="flex flex-col gap-2">
                        <p className="text-[11px] font-semibold text-[#94A3B8] tracking-[1.2px] uppercase">
                          {section.title}
                        </p>
                        <div className="flex flex-col gap-3">
                          {section.links.map((link) => {
                            const isCopied = copiedToken === link.token;

                            return (
                              <div
                                key={link.id}
                                className={cn(
                                  "rounded-lg border border-[#E2E8F0] p-4 flex flex-col gap-3",
                                  section.isExpired
                                    ? "bg-white/70 opacity-75"
                                    : "bg-[#F8FAFC]",
                                )}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                    <Link2
                                      className={cn(
                                        "w-4 h-4 shrink-0",
                                        section.isExpired
                                          ? "text-[#94A3B8]"
                                          : "text-[#10B981]",
                                      )}
                                    />
                                    <span className="text-[13px] font-semibold text-[#0F172A]">
                                      {getRoleDisplayName(link.role)}
                                    </span>
                                    <span
                                      className={cn(
                                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                        section.isExpired
                                          ? "bg-[#F1F5F9] text-[#64748B]"
                                          : "bg-[#DCFCE7] text-[#166534]",
                                      )}
                                    >
                                      {section.isExpired ? "Expired" : "Active"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(link.token)}
                                      disabled={
                                        link.token === "creating..." || isCopied
                                      }
                                      aria-label="Copy invite link"
                                      className="flex items-center justify-center w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3.5 h-3.5 text-[#10B981]" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5 text-[#64748B]" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setLinkToRevoke(link)}
                                      aria-label="Revoke magic link"
                                      className="group flex items-center justify-center w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white hover:bg-red-50 hover:border-red-200 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-[#64748B] group-hover:text-red-600 transition-colors" />
                                    </button>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 rounded-md border border-[#E2E8F0] bg-white px-3 py-2">
                                  <code className="flex-1 text-[12px] font-mono text-[#475569] truncate select-all">
                                    {getLinkUrl(link.token)}
                                  </code>
                                </div>
                                <p className="text-[11px] text-[#94A3B8]">
                                  {link.isExpired
                                    ? "Expired"
                                    : link.expiresIn === "never"
                                      ? "Never expires"
                                      : `Expires in ${link.expiresIn}`}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Link Settings + Create button */}
            {!isLoading && (
              <>
                {/* Link Settings section */}
                <div className="flex flex-col gap-3">
                  <span className="text-[11px] font-semibold text-[#94A3B8] tracking-[1.2px] uppercase">
                    Link Settings
                  </span>

                  {/* Two-column row: Join as + Expires in */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Join as pill-toggle */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-medium text-[#475569]">
                        Join as
                      </span>
                      <div
                        role="radiogroup"
                        aria-label="Join as role"
                        className="flex gap-0.5 p-[3px] rounded-lg border border-[#E2E8F0] bg-white"
                      >
                        {(
                          [
                            {
                              value: Role.member,
                              label: "Member",
                              Icon: Pencil,
                            },
                            { value: Role.guest, label: "Guest", Icon: Eye },
                          ] as const
                        ).map(({ value, label, Icon }) => (
                          <button
                            key={value}
                            type="button"
                            role="radio"
                            aria-checked={role === value ? "true" : "false"}
                            onClick={() => setRole(value)}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-[9px] rounded-[7px] text-[13px] font-medium transition-colors ${
                              role === value
                                ? "bg-[#0F172A] text-white font-semibold"
                                : "text-[#94A3B8] hover:text-[#64748B]"
                            }`}
                          >
                            <Icon
                              className="w-[13px] h-[13px]"
                              aria-hidden="true"
                            />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Expires in Select */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-medium text-[#475569]">
                        Expires in
                      </span>
                      <Select
                        value={expirationHours.toString()}
                        onValueChange={(v) => setExpirationHours(Number(v))}
                      >
                        <SelectTrigger className="rounded-lg border-[#E2E8F0] h-10 text-[13px] text-[#0F172A]">
                          <div className="flex items-center gap-2">
                            <Timer className="w-[15px] h-[15px] text-[#64748B] shrink-0" />
                            <SelectValue />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {EXPIRATION_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value.toString()}
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Role hint box */}
                  <div className="flex items-start gap-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
                    <Info className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                    <p className="text-[12px] text-[#64748B] leading-relaxed">
                      <span className="font-medium">Member:</span> can create &
                      edit posts · <span className="font-medium">Guest:</span>{" "}
                      view only
                    </p>
                  </div>
                </div>

                {/* Create button */}
                <button
                  type="button"
                  onClick={handleCreateLink}
                  disabled={isCreating}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#0F172A] text-white text-sm font-medium hover:bg-[#1E293B] transition-colors disabled:opacity-60"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  {isCreating ? "Creating..." : "Create Magic Link"}
                </button>
              </>
            )}

            {/* Blue info card */}
            <div className="flex items-start gap-2.5 rounded-lg border border-[#BFDBFE] bg-[#EFF6FF] px-3.5 py-3">
              <Info className="w-3.5 h-3.5 text-[#1D4ED8] shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed text-[#1D4ED8]">
                {expirationHours === 0
                  ? "Magic links never expire."
                  : `Magic links expire after ${EXPIRATION_OPTIONS.find((opt) => opt.value === expirationHours)?.label ?? expirationHours + " hours"}.`}{" "}
                You can revoke a link at any time.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="rounded-lg border-[#E2E8F0] text-[#0F172A] text-sm font-medium"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revoke confirmation dialog — rendered outside main Dialog to avoid nesting */}
      <Dialog
        open={!!linkToRevoke}
        onOpenChange={(open) => !open && !isRevoking && setLinkToRevoke(null)}
      >
        <DialogContent className="sm:max-w-sm rounded-xl border-[#E2E8F0] p-0 gap-0 overflow-hidden">
          <DialogDescription className="sr-only">
            Confirm revoking the magic link. Anyone with this link will no
            longer be able to join the board.
          </DialogDescription>
          <div className="p-6">
            <DialogTitle className="text-base font-bold text-[`#0F172A`]">
              Revoke Magic Link?
            </DialogTitle>
            <p className="text-sm text-[#64748B] mt-2 leading-relaxed">
              Anyone with this link will no longer be able to join the board.
              This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#E2E8F0]">
            <Button
              variant="outline"
              aria-label="Cancel revoke"
              onClick={() => setLinkToRevoke(null)}
              disabled={isRevoking}
              className="border-[#E2E8F0] rounded-lg text-sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              {isRevoking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
