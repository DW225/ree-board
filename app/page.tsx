import { Button } from "@/components/ui/button";
import {
  getKindeServerSession,
  LoginLink,
} from "@kinde-oss/kinde-auth-nextjs/server";
import dynamic from "next/dynamic";
import Link from "next/link";

const GlowEffect = dynamic(() => import("@/components/landing/GlowEffect"));

export default async function Home() {
  const { isAuthenticated } = getKindeServerSession();
  const isUserAuthenticated = await isAuthenticated();

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center bg-slate-100 overflow-hidden">
      <GlowEffect />
      <h1 className="text-9xl font-bold text-slate-800 mb-8 relative z-10">
        Ree board
      </h1>
      <h2 className="text-2xl text-slate-600 mb-8 relative z-10">
        Made retro a breeze with ReeBoard
      </h2>
      <Button className="bg-slate-600 text-white hover:bg-slate-700 transition-colors duration-200 relative z-10 h-14 w-22 text-lg">
        {isUserAuthenticated ? (
          <LoginLink>Login</LoginLink>
        ) : (
          <Link href="/board">Board</Link>
        )}
      </Button>
    </div>
  );
}
