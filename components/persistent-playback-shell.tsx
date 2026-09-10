"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, FastForward, History, ListMusic, Menu, Orbit, Pause, Play, Radio, RotateCcw, Video, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ReplayStudio, type PlaybackSnapshot, type ReplayStudioHandle } from "@/components/replay-studio";
import { AuthControls } from "@/components/auth-controls";

const studioModeByPath = {
  "/": "single",
  "/default": "single",
  "/advanced": "playlist",
} as const;

const navigationItems = [
  { href: "/", label: "Vídeo único", icon: Video },
  { href: "/advanced", label: "Playlist", icon: ListMusic },
  { href: "/playlists", label: "Minhas playlists", icon: ListMusic },
  { href: "/history", label: "Histórico", icon: History },
];

export function PersistentPlaybackShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const studioRef = useRef<ReplayStudioHandle>(null);
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>({ duration: null, hasNextVideo: false, hasPrevVideo: false, isPlaying: false, played: 0, remaining: 0, source: null, totalRepetitions: 0, volume: 0.7 });
  const [isMiniPlayerDismissed, setIsMiniPlayerDismissed] = useState(false);
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const studioMode = studioModeByPath[pathname as keyof typeof studioModeByPath];
  const isStudioRoute = Boolean(studioMode);

  useEffect(() => {
    if (studioMode) studioRef.current?.selectMode(studioMode);
  }, [studioMode]);

  useEffect(() => setIsNavigationOpen(false), [pathname]);

  useEffect(() => {
    setIsMiniPlayerDismissed(false);
  }, [snapshot.source]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 28) setIsNavbarScrolled(true);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sourceLabel = snapshot.source ? (() => {
    try {
      const source = new URL(snapshot.source);
      return `${source.hostname.replace(/^www\./, "")}${source.pathname}${source.search}`;
    } catch {
      return snapshot.source;
    }
  })() : null;
  const formatTime = (seconds: number | null) => {
    if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return "--:--";
    const totalSeconds = Math.floor(seconds);
    return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
  };
  const progress = Math.min(1, Math.max(0, snapshot.played));
  const progressLabel = snapshot.duration ? `${formatTime(progress * snapshot.duration)} / ${formatTime(snapshot.duration)}` : "Reprodução em andamento";

  return <>
    <header className={isNavbarScrolled ? "studio-heading is-scrolled" : "studio-heading"}>
      <div className="navbar-inner">
        <h1 id="studio-title"><Link className="brand-mark" href="/"><span aria-hidden="true"><Orbit size={20} /></span>Celestial Replay</Link></h1>
        <nav className={isNavigationOpen ? "navbar-navigation is-open" : "navbar-navigation"} id="main-navigation" aria-label="Navegação principal">
          {navigationItems.map(({ href, label, icon: Icon }) => <Link aria-current={pathname === href ? "page" : undefined} className={pathname === href ? "navbar-link is-active" : "navbar-link"} href={href} key={href}><Icon aria-hidden="true" size={16} />{label}</Link>)}
        </nav>
        <div className="navbar-actions">
          <AuthControls />
          <button className="navbar-menu-trigger" type="button" onClick={() => setIsNavigationOpen((value) => !value)} aria-label={isNavigationOpen ? "Fechar menu" : "Abrir menu"} aria-expanded={isNavigationOpen} aria-controls="main-navigation"><Menu aria-hidden="true" size={19} /></button>
        </div>
      </div>
    </header>
    <div className={isStudioRoute ? "persistent-studio" : "persistent-studio is-background"} aria-hidden={!isStudioRoute}>
      <ReplayStudio ref={studioRef} initialMode={studioMode ?? "single"} onPlaybackChange={setSnapshot} />
    </div>
    {!isStudioRoute && children}
    {!isStudioRoute && snapshot.source && !isMiniPlayerDismissed && <aside className="persistent-mini-player" data-playing={snapshot.isPlaying} aria-label="Reprodução em andamento">
      <div className="persistent-mini-header">
        <div className="persistent-mini-copy"><Radio aria-hidden="true" size={16} /><div><span className="persistent-mini-status" role="status" aria-live="polite">{snapshot.isPlaying ? "Reproduzindo" : "Pausado"}</span><strong title={sourceLabel ?? undefined}>{sourceLabel}</strong><span className="persistent-mini-progress-label">{progressLabel}</span></div></div>
        <button type="button" className="persistent-mini-dismiss" onClick={() => setIsMiniPlayerDismissed(true)} aria-label="Dispensar mini-player" title="Dispensar"><X aria-hidden="true" size={16} /></button>
      </div>
      <div className="persistent-mini-progress" role="progressbar" aria-label={`Progresso: ${progressLabel}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}><span style={{ width: `${progress * 100}%` }} /></div>
      <div className="persistent-mini-actions">
        <button type="button" className="persistent-mini-action" onClick={() => studioRef.current?.seekBy(-10)} aria-label="Voltar 10 segundos" title="Voltar 10 segundos"><RotateCcw aria-hidden="true" size={16} /><span>10</span></button>
        <button type="button" className="persistent-mini-action persistent-mini-play" onClick={() => studioRef.current?.togglePlayback()} aria-label={snapshot.isPlaying ? "Pausar reprodução" : "Continuar reprodução"} title={snapshot.isPlaying ? "Pausar" : "Continuar"}>{snapshot.isPlaying ? <Pause aria-hidden="true" size={17} /> : <Play aria-hidden="true" size={17} />}</button>
        <button type="button" className="persistent-mini-action" onClick={() => studioRef.current?.toggleMute()} aria-label={snapshot.volume === 0 ? "Ativar som" : "Silenciar"} title={snapshot.volume === 0 ? "Ativar som" : "Silenciar"}>{snapshot.volume === 0 ? <VolumeX aria-hidden="true" size={16} /> : <Volume2 aria-hidden="true" size={16} />}</button>
        {snapshot.hasNextVideo && <button type="button" className="persistent-mini-action" onClick={() => studioRef.current?.nextVideo()} aria-label="Próximo vídeo" title="Próximo vídeo"><FastForward aria-hidden="true" size={16} /></button>}
        <Link className="persistent-mini-open" href="/" title="Abrir player"><ExternalLink aria-hidden="true" size={15} />Abrir player</Link>
      </div>
    </aside>}
  </>;
}
