import { Puzzle } from "lucide-react";
import type { ReactNode } from "react";

function AppRow({
  icon,
  name,
  description,
  connected,
}: Readonly<{
  icon: ReactNode;
  name: string;
  description: string;
  connected: boolean;
}>) {
  return (
    <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">{name}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            connected
              ? "border border-green-200 bg-green-50 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {connected ? "Connected" : "Not connected"}
        </span>
        <button
          disabled
          title="Coming soon"
          className="rounded-md border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          {connected ? "Disconnect" : "Connect"}
        </button>
      </div>
    </div>
  );
}

function GitHubIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function SlackIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        fill="#E01E5A"
      />
      <path
        d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        fill="#ECB22E"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function ConnectedAppsCard() {
  return (
    <div
      id="apps"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Puzzle className="h-4 w-4 text-slate-500" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Connected Apps
            </h2>
            <p className="text-sm text-slate-500">
              Manage third-party integrations
            </p>
          </div>
        </div>
      </div>
      <div className="h-px bg-slate-200" />
      <div>
        <AppRow
          icon={<GitHubIcon />}
          name="GitHub"
          description="Source code, issue tracking"
          connected
        />
        <AppRow
          icon={<SlackIcon />}
          name="Slack"
          description="Team messaging and notifications"
          connected={false}
        />
        <AppRow
          icon={<GoogleIcon />}
          name="Google"
          description="Calendar and email sync"
          connected
        />
      </div>
    </div>
  );
}
