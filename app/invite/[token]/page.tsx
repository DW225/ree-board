import { Card } from "@/components/ui/card";
import { processMagicLinkAction } from "@/lib/actions/link/action";
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { Loader2, Users } from "lucide-react";
import { redirect } from "next/navigation";

interface InvitePageProps {
  params: Promise<{ token: string }>;
}

export default async function InvitePage({ params }: Readonly<InvitePageProps>) {
  const { token } = await params;
  const { isAuthenticated } = getKindeServerSession();

  // If user is not authenticated, redirect to login with post-login redirect
  if (!(await isAuthenticated())) {
    redirect(`/api/auth/login?post_login_redirect_url=/invite/${token}`);
  }

  // User is authenticated, process the magic link
  // This will either redirect to the board or to an error page
  await processMagicLinkAction(token);

  // If we reach here (shouldn't happen due to redirects in processMagicLinkAction),
  // show a loading state as fallback
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
      </Card>
    </div>
  );
}
