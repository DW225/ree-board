import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import { GRADIENT_BTN } from "./constants";

interface CheckEmailCardProps {
  email: string;
  onBackToSignIn: () => void;
}

export function CheckEmailCard({ email, onBackToSignIn }: Readonly<CheckEmailCardProps>) {
  return (
    <div className="w-full max-w-[400px] space-y-6">
      <Card className="rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border-[#E2E8F0] p-10 space-y-4">
        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-[#1E293B] tracking-[-0.5px]">
            Check your email
          </h2>
          <p className="text-sm text-[#64748B]">
            We sent a confirmation link to <strong>{email}</strong>
          </p>
        </div>
        <p className="text-sm text-[#64748B]">
          Click the link in your email to activate your account. Check your spam
          folder if you don&apos;t see it.
        </p>
        <Button
          type="button"
          onClick={onBackToSignIn}
          className={GRADIENT_BTN}
        >
          Back to Sign In <ArrowRight size={16} />
        </Button>
      </Card>
    </div>
  );
}
