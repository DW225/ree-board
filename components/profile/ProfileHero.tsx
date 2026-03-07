import { Camera, Shield, User } from "lucide-react";

interface Props {
  initials: string;
  fullName: string;
  email: string;
}

export function ProfileHero({ initials, fullName, email }: Readonly<Props>) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto max-w-[1200px] px-12 pt-8">
        {/* Avatar + Name Row */}
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-5">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500">
              <span className="text-3xl font-bold text-white">{initials}</span>
            </div>
            <div className="mb-1 flex flex-col gap-1">
              <h1 className="text-[22px] font-bold text-slate-900">
                {fullName}
              </h1>
              <p className="text-sm text-slate-500">{email}</p>
              <span className="inline-flex w-fit items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                Member
              </span>
            </div>
          </div>
          <div className="mb-2">
            {/* TODO: implement photo upload */}
            <button
              disabled
              type="button"
              title="Coming soon"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5 text-slate-500" />
              Change photo
            </button>
          </div>
        </div>

        {/* Tab Bar */}
        <nav className="mt-6 flex items-end" aria-label="Profile sections">
          <a
            href="#profile"
            className="flex items-center gap-1.5 border-b-2 border-indigo-500 px-4 py-3 text-sm font-semibold text-indigo-600"
          >
            <User className="h-[15px] w-[15px]" />
            Profile
          </a>
          <a
            href="#security"
            className="flex items-center gap-1.5 px-4 py-3 text-sm text-slate-500 transition-colors hover:text-slate-700"
          >
            <Shield className="h-[15px] w-[15px]" />
            Security
          </a>
        </nav>
      </div>
    </div>
  );
}
