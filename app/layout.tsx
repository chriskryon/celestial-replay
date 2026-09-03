import type { Metadata, Viewport } from "next";
import Image from "next/image";

import { StarfieldCanvas } from "@/components/starfield-canvas";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Celestial Replay",
  description: "Repita vídeos e crie sessões no seu próprio ritmo.",
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
        <main id="main-content">{children}</main>
      </body>
    </html>
  );
}
