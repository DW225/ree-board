import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import Link from "next/link";

interface ErrorPageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function InviteErrorPage({ searchParams }: Readonly<ErrorPageProps>) {
  const { reason } = await searchParams;

  const getErrorInfo = (errorReason: string | undefined) => {
    switch (errorReason) {
      case "invalid_or_expired":
        return {
          title: "Invalid or Expired Link",
          description: "This invitation link is invalid or has expired. Please request a new invitation from the board owner.",
          suggestion: "Contact the person who sent you this link for a new invitation."
        };
      case "authentication_failed":
        return {
          title: "Authentication Failed",
          description: "There was a problem with your authentication. Please try signing in again.",
          suggestion: "Try signing in again or contact support if the problem persists."
        };
      case "user_not_found":
        return {
          title: "User Account Not Found",
          description: "Your user account could not be found in the system.",
          suggestion: "Please contact support for assistance with your account."
        };
      case "server_error":
        return {
          title: "Server Error",
          description: "A temporary server error occurred while processing your invitation.",
          suggestion: "Please try again in a few moments. If the problem persists, contact support."
        };
      default:
        return {
          title: "Invitation Error",
          description: "An error occurred while processing your board invitation.",
          suggestion: "Please try again or contact the person who sent you this invitation."
        };
    }
  };

  const errorInfo = getErrorInfo(reason);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-rose-100">
      <Card className="w-full max-w-md p-8 text-center">
        <AlertTriangle className="size-16 mx-auto text-red-500 mb-6" />

        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          {errorInfo.title}
        </h1>

        <p className="text-muted-foreground mb-4">
          {errorInfo.description}
        </p>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">
            💡 {errorInfo.suggestion}
          </p>
        </div>

        <div className="space-y-3">
          <Button asChild variant="outline" className="w-full">
            <Link href="/">
              <Home className="size-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function generateMetadata() {
  return {
    title: "Invitation Error - Ree Board",
    description: "There was an error processing your board invitation."
  };
}