"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMagicLinks } from "@/hooks/useMagicLinks";
import { Role, roleOptions } from "@/lib/constants/role";
import { EXPIRATION_OPTIONS, isValidMagicLinkRole } from "@/lib/types/link";
import { getRoleDisplayName, magicLinkRoleOptions } from "@/lib/utils/role";
import { Check, Clock, Copy, Link } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface MagicLinkCreatorProps {
  boardId: string;
}

export default function MagicLinkCreator({
  boardId,
}: Readonly<MagicLinkCreatorProps>) {
  const [role, setRole] = useState<Role.guest | Role.member>(Role.member);
  const [expirationHours, setExpirationHours] = useState<number>(24);
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const { createLink } = useMagicLinks(boardId);

  const handleCreateLink = async () => {
    setIsCreating(true);
    setGeneratedLink(null);
    try {
      const result = await createLink({
        role,
        expirationHours, // 0 means never expires
      });

      const linkUrl = `${globalThis.location.origin}/invite/${result.link.token}`;
      setGeneratedLink(linkUrl);
      toast.success("Magic link created successfully!");
    } catch (error) {
      console.error("Failed to create magic link:", error);
      // Error toast is handled in the hook
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = async () => {
    if (generatedLink) {
      try {
        await navigator.clipboard.writeText(generatedLink);
        setIsCopied(true);
        toast.success("Link copied to clipboard!");

        // Reset copy status after 2 seconds
        setTimeout(() => setIsCopied(false), 2000);
      } catch {
        toast.error("Failed to copy link to clipboard");
      }
    }
  };

  const getExpirationDisplayName = (hours: number): string => {
    if (hours === 0) return "Never";
    const option = EXPIRATION_OPTIONS.find((opt) => opt.value === hours);
    return option?.label || `${hours} hours`;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role-select">Role</Label>
            <Select
              value={role.toString()}
              onValueChange={(value) => {
                const numericRole = Number(value) as Role;
                if (isValidMagicLinkRole(numericRole)) {
                  setRole(numericRole);
                }
              }}
            >
              <SelectTrigger id="role-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {magicLinkRoleOptions.map((option) => (
                  <SelectItem
                    key={roleOptions[option].label}
                    value={option.toString()}
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-xs">
                        {roleOptions[option].label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {roleOptions[option].description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Expiration Selection */}
          <div className="space-y-2">
            <Label htmlFor="expiration-select">Expires In</Label>
            <Select
              value={expirationHours.toString()}
              onValueChange={(value) => setExpirationHours(Number(value))}
            >
              <SelectTrigger id="expiration-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXPIRATION_OPTIONS.map((option) => (
                  <SelectItem
                    key={option.value.toString()}
                    value={option.value.toString()}
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="size-3" />
                      <span>{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Create Button */}
        <Button
          onClick={handleCreateLink}
          disabled={isCreating}
          className="w-full"
          size="lg"
        >
          <Link className="mr-2 size-4" />
          {isCreating ? "Creating Link..." : "Create Magic Link"}
        </Button>
      </div>

      {/* Generated Link Display */}
      {generatedLink && (
        <Card className="p-4 bg-green-50/50 border-green-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Check className="size-4 text-green-600" />
              <Label className="text-sm font-medium text-green-800">
                Magic Link Created!
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Share this link to invite someone to your board:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="text-xs font-mono bg-white"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {isCopied ? (
                    <Check className="size-4 text-green-600" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              💡 Anyone with this link can join your board as a{" "}
              {getRoleDisplayName(role).toLowerCase()}.
              {expirationHours > 0 && (
                <>
                  {" "}
                  The link will expire in{" "}
                  {getExpirationDisplayName(expirationHours).toLowerCase()}.
                </>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
