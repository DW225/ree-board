import { ArrowUpRight, Zap } from "lucide-react";

/** Renders the current subscription plan summary. */
export function PlanCard() {
  return (
    <div className="rounded-xl border border-indigo-200 bg-linear-to-br/srgb from-indigo-50 to-violet-50 p-5 shadow-xs">
      <div className="flex flex-col gap-3">
        <div className="flex w-fit items-center gap-1.5 rounded-full bg-indigo-500 px-2.5 py-1">
          <Zap className="h-3 w-3 fill-white text-white" />
          <span className="text-xs font-semibold text-white">Free Plan</span>
        </div>
        <p className="text-sm leading-relaxed text-slate-600">
          Upgrade for unlimited boards, advanced analytics, and priority
          support.
        </p>
        {/* Upgrade flow not yet implemented */}
        <button
          disabled
          type="button"
          title="Coming soon"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-linear-to-b/srgb from-indigo-500 to-violet-600 py-2 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
