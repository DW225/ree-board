"use client";

import { Card } from "@/components/ui/card";
import { createAnonymousGuestSession } from "@/lib/actions/guest/action";
import { processMagicLinkAction } from "@/lib/actions/link/action";
import { createClient } from "@/lib/utils/supabase/client";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Loader2, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default function InvitePage({ params }: Readonly<InvitePageProps>) {
  const [token, setToken] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<
    "checking" | "authenticated" | "needs_guest"
  >("checking");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [inviteProcessed, setInviteProcessed] = useState(false);
  const turnstileRef = useRef<TurnstileInstance>(null);
  const supabase = useMemo(() => createClient(), []);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  // Extract token from params
  useEffect(() => {
    params
      .then((p) => setToken(p.token))
      .catch(() => setError("Failed to load invitation token."));
  }, [params]);

  // Check authentication status using client-side Supabase
  useEffect(() => {
    if (!token) return;

    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setAuthStatus("authenticated");
      } else {
        setAuthStatus("needs_guest");
      }
    };

    checkAuth();
  }, [token, supabase]);

  // Process invite when authenticated (or after guest session created)
  useEffect(() => {
    if (!token || authStatus !== "authenticated" || inviteProcessed) return;

    const processInvite = async () => {
      setInviteProcessed(true);
      setIsProcessing(true);

      try {
        // Call server action - it returns a redirect URL
        const result = await processMagicLinkAction(token);

        if (result.redirectUrl) {
          // Perform client-side navigation
          globalThis.location.href = result.redirectUrl;
        } else {
          // No redirect URL - show error
          setError(result.error || "An unexpected error occurred.");
          setIsProcessing(false);
        }
      } catch (err) {
        // Real errors should be displayed
        console.error("Error processing magic link:", err);
        setError("Failed to process invitation. Please try again.");
        setIsProcessing(false);
      }
    };

    processInvite();
  }, [token, authStatus, inviteProcessed]);

  // Handle guest session creation after CAPTCHA success
  useEffect(() => {
    if (!token || authStatus !== "needs_guest" || !captchaToken || isProcessing)
      return;

    const createGuestAndProcess = async () => {
      setIsProcessing(true);
      setError(null);

      try {
        // Create guest session with CAPTCHA token
        const result = await createAnonymousGuestSession(captchaToken);

        if (!result.success) {
          setError(result.error || "Failed to create guest session");
          setIsProcessing(false);
          turnstileRef.current?.reset();
          setCaptchaToken(null);
          return;
        }

        // Reload the page to ensure Supabase cookies are properly set
        // The reload will pick up the new session and proceed with invite processing
        globalThis.location.reload();
      } catch (err) {
        console.error("Error creating guest session:", err);
        setError("An unexpected error occurred. Please try again.");
        setIsProcessing(false);
        turnstileRef.current?.reset();
        setCaptchaToken(null);
      }
    };

    createGuestAndProcess();
  }, [token, authStatus, captchaToken, isProcessing]);

  // Show loading while checking auth or processing
  if (authStatus === "checking" || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md p-8 text-center">
          <Users className="size-16 mx-auto text-blue-500 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Loading Invitation...
          </h1>
          <div className="flex items-center justify-center gap-3">
            <Loader2 className="size-5 animate-spin text-blue-500" />
            <span className="text-muted-foreground">
              Checking authentication
            </span>
          </div>
        </Card>
      </div>
    );
  }

  // Show CAPTCHA for unauthenticated users
  if (authStatus === "needs_guest" && !isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md p-8 text-center">
          <Users className="size-16 mx-auto text-blue-500 mb-6" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Join as Guest
          </h1>
          <p className="text-muted-foreground mb-6">
            Please verify you&apos;re human to join this board as a guest.
          </p>

          {siteKey && (
            <div className="flex justify-center mb-4">
              <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onSuccess={(token) => setCaptchaToken(token)}
                onError={() => {
                  setError("CAPTCHA verification failed. Please try again.");
                  setCaptchaToken(null);
                }}
                onExpire={() => setCaptchaToken(null)}
              />
            </div>
          )}

          {!siteKey && (
            <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded mb-4">
              CAPTCHA is not configured. Contact the administrator.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </p>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            Guest accounts expire after 30 days and are limited to one board.
            You can upgrade to a full account later.
          </p>
        </Card>
      </div>
    );
  }

  // Show processing state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md p-8 text-center">
        <Users className="size-16 mx-auto text-blue-500 mb-6" />
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Joining Board...
        </h1>

        <div className="flex items-center justify-center gap-3 mb-6">
          <Loader2 className="size-5 animate-spin text-blue-500" />
          <span className="text-muted-foreground">Adding you to the board</span>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>This should only take a moment.</p>
          <p>You&apos;ll be redirected automatically once complete.</p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded mt-4">
            {error}
          </p>
        )}
      </Card>
    </div>
  );
}
