"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Pause, Play, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ReplayStudio, type PlaybackSnapshot, type ReplayStudioHandle } from "@/components/replay-studio";

const studioModeByPath = {
  "/": "single",
  "/default": "single",
  "/advanced": "playlist",
} as const;

export function PersistentPlaybackShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const studioRef = useRef<ReplayStudioHandle>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>({ isPlaying: false, source: null });
  const studioMode = studioModeByPath[pathname as keyof typeof studioModeByPath];
  const isStudioRoute = Boolean(studioMode);

  useEffect(() => {
    if (studioMode) studioRef.current?.selectMode(studioMode);
  }, [studioMode]);

  const sourceLabel = snapshot.source ? (() => {
    try {
      const source = new URL(snapshot.source);
      return `${source.hostname.replace(/^www\./, "")}${source.pathname}${source.search}`;
    } catch {
      return snapshot.source;
    }
  })() : null;

  return <>
    <div className={isStudioRoute ? "persistent-studio" : "persistent-studio is-background"} aria-hidden={!isStudioRoute}>
      <ReplayStudio ref={studioRef} initialMode={studioMode ?? "single"} onPlaybackChange={setSnapshot} />
    </div>
    {!isStudioRoute && children}
    {!isStudioRoute && snapshot.source && <aside className="persistent-mini-player" data-playing={snapshot.isPlaying} aria-label="Reprodução em andamento">
      <div className="persistent-mini-copy"><Radio aria-hidden="true" size={16} /><div><span className="persistent-mini-status">{snapshot.isPlaying ? "Reproduzindo" : "Pausado"}</span><span title={sourceLabel ?? undefined}>{sourceLabel}</span></div></div>
      <button type="button" className="icon-save-button" onClick={() => studioRef.current?.togglePlayback()} aria-label={snapshot.isPlaying ? "Pausar reprodução" : "Continuar reprodução"} title={snapshot.isPlaying ? "Pausar" : "Continuar"}>{snapshot.isPlaying ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}</button>
      <Link className="persistent-mini-open" href="/" title="Abrir player">Abrir player</Link>
    </aside>}
  </>;
}
