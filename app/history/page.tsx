import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarClock, CircleCheck, ExternalLink, History, ListFilter, ListMusic, Play, Repeat2, RotateCcw, Video } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";
import { OpenAuthButton } from "@/components/open-auth-button";

export const dynamic = "force-dynamic";

function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ period?: string; origin?: string }> }) {
  const filters = await searchParams;
  const user = await getCurrentUser();
  const entries = user ? await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt)) : [];
  const periodDays = Number(filters.period) || 0;
  const cutoff = periodDays > 0 ? new Date(Date.now() - periodDays * 86_400_000) : null;
  const origins = Array.from(new Set(entries.filter((entry) => isPlayableMediaUrl(entry.url)).map((entry) => displayHost(entry.url)))).sort();
  const playableEntries = entries.filter((entry) => isPlayableMediaUrl(entry.url) && (!cutoff || entry.completedAt >= cutoff) && (!filters.origin || displayHost(entry.url) === filters.origin));
  const groupedEntries = Array.from(playableEntries.reduce((groups, entry) => {
    const current = groups.get(entry.url);
    if (current) { current.completedRepetitions += entry.completedRepetitions; current.sessions += 1; return groups; }
    groups.set(entry.url, { ...entry, sessions: 1 });
    return groups;
  }, new Map<string, (typeof playableEntries)[number] & { sessions: number }>()).values());

  if (user) return <section className="studio-shell account-shell" aria-labelledby="history-title"><nav className="studio-tabs" aria-label="Áreas do Celestial Replay"><Link className="studio-tab" href="/"><Video aria-hidden="true" size={16} />Vídeo único</Link><Link className="studio-tab" href="/advanced"><ListMusic aria-hidden="true" size={16} />Playlist</Link><Link className="studio-tab" href="/playlists"><ListMusic aria-hidden="true" size={16} />Minhas playlists</Link><Link className="studio-tab is-selected" href="/history" aria-current="page"><History aria-hidden="true" size={16} />Histórico</Link></nav><div className="history-surface">
    <header className="history-heading"><span className="history-heading-icon"><History aria-hidden="true" size={22} /></span><div><h1 id="history-title">Seu histórico</h1><p>As sessões concluídas ficam aqui, em ordem do que você viu por último.</p></div></header>
    {playableEntries.length === 0 ? <div className="history-empty"><Play aria-hidden="true" size={22} /><p>Nenhuma sessão concluída ainda. Sua primeira repetição aparecerá aqui.</p><Link className="primary-button" href="/">Reproduzir um vídeo</Link></div> : <><form className="history-filters"><label><ListFilter aria-hidden="true" size={15}/><span>Período</span><select name="period" defaultValue={filters.period ?? ""}><option value="">Tudo</option><option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option></select></label><label><span>Origem</span><select name="origin" defaultValue={filters.origin ?? ""}><option value="">Todas</option>{origins.map((origin) => <option value={origin} key={origin}>{origin}</option>)}</select></label><button className="secondary-button" type="submit">Filtrar</button></form><ol className="history-feed">{groupedEntries.map((entry) => {
      const host = displayHost(entry.url);
      const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "medium" }).format(entry.completedAt);
      return <li key={entry.url}><article className="history-card"><span className="history-domain-icon"><CircleCheck aria-hidden="true" size={16} /></span><div className="history-card-copy"><a href={entry.url} target="_blank" rel="noreferrer" title={entry.url}><strong>{host}</strong><ExternalLink aria-hidden="true" size={14} /></a><p><CalendarClock aria-hidden="true" size={14} />{date}</p></div><div className="history-card-actions"><span className="timeline-count"><Repeat2 aria-hidden="true" size={14} />{entry.completedRepetitions}× em {entry.sessions} {entry.sessions === 1 ? "sessão" : "sessões"}</span><Link className="history-replay" href={`/?source=${encodeURIComponent(entry.url)}&repetitions=${entry.completedRepetitions}`}><RotateCcw aria-hidden="true" size={15} />Repetir</Link></div></article></li>;
    })}</ol></>}
  </div></section>;

  return (
    <section className="empty-surface" aria-labelledby="history-title">
      <h1 id="history-title">Seu histórico fica guardado na sua conta.</h1>
      <p>
        Você pode reproduzir vídeos sem entrar. Quando a autenticação Neon estiver
        conectada, as sessões concluídas aparecerão aqui — privadas e sincronizadas.
      </p>
      <OpenAuthButton className="button button-primary">
        <History aria-hidden="true" size={17} />Entrar para sincronizar
      </OpenAuthButton>
    </section>
  );
}
