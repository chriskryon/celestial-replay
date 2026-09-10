import type { Metadata, Viewport } from "next";
import Image from "next/image";

import { AuthDialogProvider } from "@/components/auth-dialog";
import { PersistentPlaybackShell } from "@/components/persistent-playback-shell";
import { StarfieldCanvas } from "@/components/starfield-canvas";
import "@/styles/globals.css";

const siteUrl = new URL(process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_ORIGIN ?? "https://celestial-replay.vercel.app");
const siteDescription = "Repita vídeos, monte playlists com contagens por item e retome sessões no seu próprio ritmo.";
const socialImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Celestial Replay - player de repetição de vídeos",
};

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Celestial Replay",
  title: {
    default: "Celestial Replay",
    template: "%s | Celestial Replay",
  },
  description: siteDescription,
  keywords: ["repetir vídeo", "playlist com repetições", "video looper", "YouTube repeat", "Celestial Replay"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Celestial Replay",
    description: siteDescription,
    url: "/",
    siteName: "Celestial Replay",
    images: [socialImage],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Celestial Replay",
    description: siteDescription,
    images: [socialImage],
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = { themeColor: "#080b1b", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {/* THESIS: playback is immediate; permanence is earned through sign-in. OWN-WORLD: midnight-blue celestial field and restrained liquid-glass control surfaces. STORY: paste a source, choose exact repetitions, and see completion without ambiguity. FIRST VIEWPORT: the player and its settings share one focused workspace. FORM: operational studio, pinned celestial-liquid-glass direction. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md */}
        <a className="skip-link" href="#main-content">Pular para o player</a>
        <div className="universe-backdrop" aria-hidden="true">
          <Image alt="" fill priority sizes="100vw" src="/bg.jpg" />
        </div>
        <StarfieldCanvas />
        <AuthDialogProvider><main id="main-content"><PersistentPlaybackShell>{children}</PersistentPlaybackShell></main></AuthDialogProvider>
      </body>
    </html>
  );
}
