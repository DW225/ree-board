import { AuthProvider } from "@/components/common/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";
import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Ree Board - Collaborative Retrospective Board",
    template: "%s | Ree Board",
  },
  description:
    "A modern, real-time retrospective board application for agile teams. Create boards, collaborate with your team, and improve your workflow.",
  keywords: [
    "retrospective",
    "agile",
    "scrum",
    "team collaboration",
    "board",
    "retro",
  ],
  authors: [{ name: "Ree Board Team" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ree-board.tekdw.com/",
    title: "Ree Board - Collaborative Retrospective Board",
    description:
      "A modern, real-time retrospective board application for agile teams",
    siteName: "Ree Board",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ree Board - Collaborative Retrospective Board",
    description:
      "A modern, real-time retrospective board application for agile teams",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      {
        url: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        url: "/favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        url: "/favicon.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
    ],
    shortcut: "/favicon.svg",
    apple: "/favicon-192x192.png",
  },
};

const SpeedInsights = dynamic(() =>
  import("@vercel/speed-insights/next").then((mod) => mod.SpeedInsights)
);

const VercelToolbar = dynamic(() =>
  import("@vercel/toolbar/next").then((mod) => mod.VercelToolbar)
);

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const shouldInjectToolbar = process.env.NODE_ENV === "development";
  const shouldInjectSpeedInsights = process.env.NODE_ENV !== "development";
  return (
    <AuthProvider>
      <html lang="en">
        <body>
          <main id="app" className="flex flex-col" data-theme="light">
            <div className="flex-grow-1">{children}</div>
            {shouldInjectToolbar && <VercelToolbar />}
          </main>
          <Toaster />
          {shouldInjectSpeedInsights && <SpeedInsights />}
        </body>
      </html>
    </AuthProvider>
  );
}
