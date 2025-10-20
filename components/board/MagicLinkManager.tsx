"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useMagicLinks } from "@/hooks/useMagicLinks";
import { Role } from "@/lib/constants/role";
import { MS_PER_HOUR } from "@/lib/constants/time";
import type { LinkWithCreator } from "@/lib/types/link";
import { AlertTriangle, Clock, Copy, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";

interface MagicLinkManagerProps {
  boardId: string;
}

export default function MagicLinkManager({ boardId }: Readonly<MagicLinkManagerProps>) {
  const { links, isLoading, revokeLink, copyLinkToClipboard } =
    useMagicLinks(boardId);
  const [linkToRevoke, setLinkToRevoke] = useState<LinkWithCreator | null>(
    null
  );
  const [isRevoking, setIsRevoking] = useState(false);

  const handleRevoke = async (link: LinkWithCreator) => {
    setLinkToRevoke(link);
  };

  const confirmRevoke = async () => {
    if (!linkToRevoke) return;

    setIsRevoking(true);
    try {
      await revokeLink(linkToRevoke.id);
      setLinkToRevoke(null);
    } catch (error) {
      console.error("Failed to revoke link:", error);
      // Error toast is handled in the hook
    } finally {
      setIsRevoking(false);
    }
  };

  const handleCopyLink = async (token: string) => {
    try {
      await copyLinkToClipboard(token);
    } catch (error) {
      console.error("Failed to copy link:", error);
      // Error toast is handled in the hook
    }
  };

  const getRoleDisplayName = (role: Role): string => {
    return role === Role.member ? "Member" : "Guest";
  };

  const getRoleBadgeVariant = (role: Role) => {
    return role === Role.member ? "default" : "secondary";
  };

  const getExpirationStatus = (link: LinkWithCreator) => {
    if (!link.expiresAt) {
      return {
        status: "never",
        text: "Never expires",
        variant: "default" as const,
      };
    }

    if (link.isExpired) {
      return {
        status: "expired",
        text: "Expired",
        variant: "destructive" as const,
      };
    }

    const now = Date.now();
    const expiresAt = new Date(link.expiresAt);
    const hoursLeft = (expiresAt.getTime() - now) / MS_PER_HOUR;

    if (hoursLeft <= 24) {
      return {
        status: "expires_soon",
        text: `Expires in ${link.expiresIn}`,
        variant: "outline" as const,
      };
    }

    return {
      status: "active",
      text: `Expires in ${link.expiresIn}`,
      variant: "secondary" as const,
    };
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="text-sm text-muted-foreground">
          Loading magic links...
        </div>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-2">
          <ExternalLink className="size-8 mx-auto text-muted-foreground" />
          <div className="text-sm font-medium">No magic links yet</div>
          <div className="text-xs text-muted-foreground">
            Create your first magic link to invite people to this board
          </div>
        </div>
      </Card>
    );
  }

  const activeLinks = links.filter((link) => !link.isExpired);
  const expiredLinks = links.filter((link) => link.isExpired);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Magic Links ({links.length})
        </Label>
        {expiredLinks.length > 0 && (
          <Badge variant="outline" className="text-xs">
            {expiredLinks.length} expired
          </Badge>
        )}
      </div>

      <div className="space-y-3">
        {/* Active Links */}
        {activeLinks.map((link) => {
          const expStatus = getExpirationStatus(link);

          return (
            <Card key={link.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Role and Status */}
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(link.role)}>
                      {getRoleDisplayName(link.role)}
                    </Badge>
                    <Badge variant={expStatus.variant}>
                      <Clock className="size-3 mr-1" />
                      {expStatus.text}
                    </Badge>
                  </div>

                  {/* Creator and Date */}
                  <div className="text-sm text-muted-foreground">
                    Created by{" "}
                    <span className="font-medium">
                      {link.creatorName || "Unknown"}
                    </span>
                    {" • "}
                    <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                  </div>

                  {/* Expiration Warning */}
                  {expStatus.status === "expires_soon" && (
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="size-3" />
                      This link expires soon
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyLink(link.token)}
                    disabled={link.isExpired}
                    aria-label="Copy invite link"
                    title="Copy invite link"
                  >
                    <Copy className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevoke(link)}
                    aria-label="Revoke magic link"
                    title="Revoke magic link"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}

        {/* Separator between active and expired */}
        {activeLinks.length > 0 && expiredLinks.length > 0 && (
          <Separator className="my-4" />
        )}

        {/* Expired Links */}
        {expiredLinks.map((link) => {
          const expStatus = getExpirationStatus(link);

          return (
            <Card key={link.id} className="p-4 opacity-60">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Role and Status */}
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getRoleDisplayName(link.role)}
                    </Badge>
                    <Badge variant={expStatus.variant}>
                      <Clock className="size-3 mr-1" />
                      {expStatus.text}
                    </Badge>
                  </div>

                  {/* Creator and Date */}
                  <div className="text-sm text-muted-foreground">
                    Created by{" "}
                    <span className="font-medium">
                      {link.creatorName || "Unknown"}
                    </span>
                    {" • "}
                    <span>{new Date(link.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Actions for expired links */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRevoke(link)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!linkToRevoke} onOpenChange={() => setLinkToRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Magic Link</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke this magic link? This action
              cannot be undone.
              {linkToRevoke && !linkToRevoke.isExpired && (
                <span className="block mt-2 text-amber-600">
                  ⚠️ This link is still active and can currently be used to join
                  the board.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {linkToRevoke && (
            <div className="py-4">
              <Card className="p-3 bg-muted/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(linkToRevoke.role)}>
                      {getRoleDisplayName(linkToRevoke.role)}
                    </Badge>
                    <Badge variant={getExpirationStatus(linkToRevoke).variant}>
                      {getExpirationStatus(linkToRevoke).text}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Created by {linkToRevoke.creatorName || "Unknown"}
                  </div>
                </div>
              </Card>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLinkToRevoke(null)}
              disabled={isRevoking}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmRevoke}
              disabled={isRevoking}
            >
              {isRevoking ? "Revoking..." : "Revoke Link"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
