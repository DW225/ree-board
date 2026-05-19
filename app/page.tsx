import AuthCard from "@/components/landing/AuthCard";
import Image from "next/image";

export default function Home() {
  return (
    <main className="flex flex-col lg:flex-row min-h-screen">
      {/* Left panel */}
      <div className="flex flex-col justify-between lg:w-[680px] shrink-0 px-16 py-20 bg-[linear-gradient(160deg,#E0E7FF_0%,#EDE9FE_100%)]">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Image
            src="/favicon.svg"
            alt="ReeBoard logo"
            width={32}
            height={32}
          />
          <span className="text-[18px] font-bold text-[#1E293B]">ReeBoard</span>
        </div>

        {/* Headline + subheadline */}
        <div className="flex flex-col gap-6">
          <h1 className="text-[40px] font-extrabold text-[#1E293B] leading-tight tracking-tight max-w-[480px]">
            Run retrospectives that actually move teams forward.
          </h1>
          <p className="text-base text-[#64748B] leading-[1.6] max-w-[440px]">
            Structured retros. Real-time collaboration. Actionable outcomes.
            Built for modern engineering teams.
          </p>
        </div>

        {/* Spacer */}
        <div />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFC] px-6 lg:px-[72px] py-[60px]">
        <AuthCard />
      </div>
    </main>
  );
}
