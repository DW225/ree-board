interface Props {
  ownedBoardCount: number;
  memberBoardCount: number;
  memberSince: Date | null;
}

export function AccountStatsCard({
  ownedBoardCount,
  memberBoardCount,
  memberSince,
}: Readonly<Props>) {
  const memberSinceFormatted = memberSince
    ? memberSince.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : "—";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">Account Overview</h3>
      <div className="my-4 h-px bg-slate-200" />
      <div className="flex flex-col gap-3">
        <StatRow label="Boards owned" value={String(ownedBoardCount)} />
        <StatRow label="Boards joined" value={String(memberBoardCount)} />
        <StatRow label="Member since" value={memberSinceFormatted} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}
