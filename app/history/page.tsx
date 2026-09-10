import Link from "next/link";
import { History, Play } from "lucide-react";
import { desc, eq } from "drizzle-orm";

import { HistoryAccessPanel } from "@/components/history/history-access-panel";
import { HistoryDayGroup } from "@/components/history/history-day-group";
import { HistoryFilters, type HistoryFiltersValue } from "@/components/history/history-filters";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { displayHost, displaySource, groupHistoryByDay, isVisibleHistoryEntry, summarizeHistory } from "@/lib/history-presentation";

export const dynamic = "force-dynamic";

type HistoryPageProps = { searchParams: Promise<HistoryFiltersValue> };

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const filters = await searchParams;
  const user = await getCurrentUser();

  if (!user) return <HistoryVisitorPage />;

  const entries = await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt));
  const enrichedEntries = await enrichHistory(entries);
  const history = filterHistory(enrichedEntries, filters);
  const origins = availableOrigins(entries);
  const days = groupHistoryByDay(summarizeHistory(history));

  return (
    <>
      <section className="studio-shell account-shell" aria-labelledby="history-title">
        <section className="history-surface">
          <HistoryHeading totalSessions={history.length} />
          {history.length === 0 ? <HistoryEmptyState filters={filters} /> : (
            <>
              <HistoryFilters filters={filters} origins={origins} resultCount={history.length} />
              <div className="history-days">
                {days.map(([day, entriesForDay], index) => <HistoryDayGroup entries={entriesForDay} index={index} key={day} />)}
              </div>
            </>
          )}
        </section>
      </section>
    </>
  );
}

function HistoryVisitorPage() {
  return (
    <>
      <section className="studio-shell account-shell" aria-labelledby="history-title">
        <HistoryAccessPanel />
      </section>
    </>
  );
}

function HistoryHeading({ totalSessions }: { totalSessions: number }) {
  const summary = totalSessions > 0
    ? `${totalSessions} ${totalSessions === 1 ? "sessão concluída" : "sessões concluídas"} · organizado por dia`
    : "Suas sessões concluídas vão aparecer aqui.";

  return (
    <header className="history-heading">
      <span className="history-heading-icon"><History aria-hidden="true" size={22} /></span>
      <div><h1 id="history-title">Seu histórico</h1><p>{summary}</p></div>
    </header>
  );
}

function HistoryEmptyState({ filters }: { filters: HistoryFiltersValue }) {
  const hasFilters = Boolean(filters.q || filters.origin || filters.period);
  return (
    <section aria-live="polite" className="history-empty">
      <span className="history-empty-icon"><History aria-hidden="true" size={22} /></span>
      <div>
        <h2>{hasFilters ? "Nenhuma sessão encontrada" : "Seu histórico começa na próxima repetição"}</h2>
        <p>{hasFilters ? "Ajuste ou limpe os filtros para ver outras sessões." : "Quando um vídeo terminar, ele ficará guardado aqui com data, horário e quantidade de repetições."}</p>
      </div>
      {hasFilters
        ? <Link className="secondary-button" href="/history">Limpar filtros</Link>
        : <Link className="primary-button" href="/"><Play aria-hidden="true" size={17} />Reproduzir um vídeo</Link>}
    </section>
  );
}

type HistoryEntry = (typeof playbackHistory.$inferSelect) & {
  authorName: string | null;
  title: string;
};

async function enrichHistory(entries: (typeof playbackHistory.$inferSelect)[]) {
  const metadata = new Map<string, { authorName: string | null; title: string }>();
  const urls = Array.from(new Set(entries.filter(isVisibleHistoryEntry).map((entry) => entry.url)));
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { next: { revalidate: 3600 } });
      if (!response.ok) return;
      const result = await response.json() as { author_name?: string; title?: string };
      if (result.title) metadata.set(url, { authorName: result.author_name ?? null, title: result.title });
    } catch { /* a URL continua visível mesmo sem metadados */ }
  }));
  return entries.filter(isVisibleHistoryEntry).map((entry): HistoryEntry => ({
    ...entry,
    authorName: metadata.get(entry.url)?.authorName ?? null,
    title: metadata.get(entry.url)?.title ?? displaySource(entry.url),
  }));
}

function filterHistory(entries: HistoryEntry[], filters: HistoryFiltersValue) {
  const periodDays = Number(filters.period) || 0;
  const cutoff = periodDays > 0 ? new Date(Date.now() - periodDays * 86_400_000) : null;
  const query = filters.q?.trim().toLocaleLowerCase() ?? "";

  return entries.filter((entry) => isVisibleHistoryEntry(entry)
    && (!cutoff || entry.completedAt >= cutoff)
    && (!filters.origin || displayHost(entry.url) === filters.origin)
    && (!query || `${entry.title} ${entry.authorName ?? ""} ${displaySource(entry.url)}`.toLocaleLowerCase().includes(query)));
}

function availableOrigins(entries: (typeof playbackHistory.$inferSelect)[]) {
  return Array.from(new Set(entries.filter(isVisibleHistoryEntry).map((entry) => displayHost(entry.url)))).sort();
}
