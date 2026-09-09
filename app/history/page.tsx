import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { AudioLines, CalendarClock, ExternalLink, History, ListFilter, ListMusic, Play, Repeat2, RotateCcw, Search, Video, Youtube } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { OpenAuthButton } from "@/components/open-auth-button";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium", timeStyle: "short" });
const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "numeric", month: "long" });

function displayHost(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function displaySource(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}${parsed.search}`;
  } catch { return url; }
}

function historyDay(date: Date) {
  return dayFormatter.format(date);
}

function historyDayLabel(date: Date) {
  const today = historyDay(new Date());
  const yesterday = historyDay(new Date(Date.now() - 86_400_000));
  const key = historyDay(date);
  if (key === today) return "Hoje";
  if (key === yesterday) return "Ontem";
  return dayLabelFormatter.format(date);
}

function SourceIcon({ url }: { url: string }) {
  const host = displayHost(url);
  if (host.includes("youtube.com") || host === "youtu.be") return <Youtube aria-hidden="true" size={17} />;
  if (host.includes("soundcloud.com")) return <AudioLines aria-hidden="true" size={17} />;
  return <Video aria-hidden="true" size={17} />;
}

function AreaTabs() {
  return <nav className="studio-tabs" aria-label="Áreas do Celestial Replay">
    <Link className="studio-tab" href="/"><Video aria-hidden="true" size={16} />Vídeo único</Link>
    <Link className="studio-tab" href="/advanced"><ListMusic aria-hidden="true" size={16} />Playlist</Link>
    <Link className="studio-tab" href="/playlists"><ListMusic aria-hidden="true" size={16} />Minhas playlists</Link>
    <Link className="studio-tab is-selected" href="/history" aria-current="page"><History aria-hidden="true" size={16} />Histórico</Link>
  </nav>;
}

function AppHeader() {
  return <header className="studio-heading"><div className="navbar-inner"><h1><Link className="brand-mark" href="/"><span aria-hidden="true"><ListMusic size={19} /></span>Celestial Replay</Link></h1><AuthControls /></div></header>;
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ period?: string; origin?: string; q?: string }> }) {
  const filters = await searchParams;
  const user = await getCurrentUser();
  const entries = user ? await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt)) : [];
  const periodDays = Number(filters.period) || 0;
  const cutoff = periodDays > 0 ? new Date(Date.now() - periodDays * 86_400_000) : null;
  const origins = Array.from(new Set(entries.filter((entry) => isPlayableMediaUrl(entry.url)).map((entry) => displayHost(entry.url)))).sort();
  const query = filters.q?.trim().toLocaleLowerCase() ?? "";
  const playableEntries = entries.filter((entry) => isPlayableMediaUrl(entry.url) && (!cutoff || entry.completedAt >= cutoff) && (!filters.origin || displayHost(entry.url) === filters.origin) && (!query || displaySource(entry.url).toLocaleLowerCase().includes(query)));

  const summaries = Array.from(playableEntries.reduce((groups, entry) => {
    const key = `${historyDay(entry.completedAt)}:${entry.url}`;
    const current = groups.get(key);
    if (current) {
      current.completedRepetitions += entry.completedRepetitions;
      current.sessions += 1;
      return groups;
    }
    groups.set(key, { ...entry, sessions: 1 });
    return groups;
  }, new Map<string, (typeof playableEntries)[number] & { sessions: number }>()).values());
  const days = Array.from(summaries.reduce((groups, entry) => {
    const key = historyDay(entry.completedAt);
    const current = groups.get(key) ?? [];
    current.push(entry);
    groups.set(key, current);
    return groups;
  }, new Map<string, typeof summaries>()).entries());
  const totalSessions = playableEntries.length;

  if (!user) return <><AppHeader /><section className="studio-shell account-shell" aria-labelledby="history-title"><AreaTabs /><section className="history-access-panel">
    <span className="history-access-icon"><History aria-hidden="true" size={26} /></span>
    <div className="history-access-copy"><span className="eyebrow">Seu espaço pessoal</span><h1 id="history-title">Guarde o que vale repetir.</h1><p>Histórico, playlists e retomada ficam privados na sua conta. Você ainda pode reproduzir vídeos livremente sem entrar.</p></div>
    <ul className="history-access-benefits"><li><History aria-hidden="true" size={16} />Sessões organizadas por dia</li><li><ListMusic aria-hidden="true" size={16} />Playlists disponíveis em qualquer dispositivo</li><li><Repeat2 aria-hidden="true" size={16} />Retome uma fila de onde parou</li></ul>
    <div className="history-access-actions"><OpenAuthButton className="primary-button"><History aria-hidden="true" size={17} />Entrar para guardar</OpenAuthButton><Link className="secondary-button" href="/">Continuar sem conta</Link></div>
  </section></section></>;

  return <><AppHeader /><section className="studio-shell account-shell" aria-labelledby="history-title"><AreaTabs /><div className="history-surface">
    <header className="history-heading"><span className="history-heading-icon"><History aria-hidden="true" size={22} /></span><div><h1 id="history-title">Seu histórico</h1><p>{totalSessions > 0 ? `${totalSessions} ${totalSessions === 1 ? "sessão concluída" : "sessões concluídas"} · organizado por dia` : "Suas sessões concluídas vão aparecer aqui."}</p></div></header>
    {playableEntries.length === 0 ? <section className="history-empty" aria-live="polite"><span className="history-empty-icon"><History aria-hidden="true" size={22} /></span><div><h2>{query || filters.origin || filters.period ? "Nenhuma sessão encontrada" : "Seu histórico começa na próxima repetição"}</h2><p>{query || filters.origin || filters.period ? "Ajuste ou limpe os filtros para ver outras sessões." : "Quando um vídeo terminar, ele ficará guardado aqui com data, horário e quantidade de repetições."}</p></div>{query || filters.origin || filters.period ? <Link className="secondary-button" href="/history">Limpar filtros</Link> : <Link className="primary-button" href="/"><Play aria-hidden="true" size={17} />Reproduzir um vídeo</Link>}</section> : <>
      <form className="history-filters"><label className="history-search"><Search aria-hidden="true" size={15}/><span className="sr-only">Buscar no histórico</span><input name="q" defaultValue={filters.q ?? ""} placeholder="Buscar vídeo ou origem" /></label><label><ListFilter aria-hidden="true" size={15}/><span>Período</span><select name="period" defaultValue={filters.period ?? ""}><option value="">Tudo</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label><label><span>Origem</span><select name="origin" defaultValue={filters.origin ?? ""}><option value="">Todas</option>{origins.map((origin) => <option value={origin} key={origin}>{origin}</option>)}</select></label><button className="secondary-button" type="submit">Filtrar</button></form>
      <div className="history-days">{days.map(([day, entriesForDay]) => <section className="history-day" key={day}><header><h2>{historyDayLabel(entriesForDay[0].completedAt)}</h2><span>{entriesForDay.length} {entriesForDay.length === 1 ? "vídeo" : "vídeos"}</span></header><ol className="history-feed">{entriesForDay.map((entry) => {
        const source = displaySource(entry.url);
        const date = dateTimeFormatter.format(entry.completedAt);
        return <li key={`${day}-${entry.url}`}><article className="history-card"><span className="history-domain-icon"><SourceIcon url={entry.url} /></span><div className="history-card-copy"><a href={entry.url} target="_blank" rel="noreferrer" title={entry.url}><strong>{source}</strong><ExternalLink aria-hidden="true" size={14} /></a><p><CalendarClock aria-hidden="true" size={14} />{date}</p></div><div className="history-card-actions"><span className="timeline-count"><Repeat2 aria-hidden="true" size={14} />{entry.completedRepetitions}× em {entry.sessions} {entry.sessions === 1 ? "sessão" : "sessões"}</span><Link className="history-replay" href={`/?source=${encodeURIComponent(entry.url)}&repetitions=${entry.completedRepetitions}`}><RotateCcw aria-hidden="true" size={15} />Repetir</Link></div></article></li>;
      })}</ol></section>)}</div>
    </>}
  </div></section></>;
}
