import { desc, eq } from "drizzle-orm";

import type { HistoryFiltersValue } from "@/components/history/history-filters";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { displayHost, displaySource, groupHistoryByDay, isVisibleHistoryEntry, summarizeHistory } from "@/lib/history-presentation";

export type HistoryEntry = (typeof playbackHistory.$inferSelect) & {
  authorName: string | null;
  title: string;
};

export async function getHistoryPageData(filters: HistoryFiltersValue) {
  const user = await getCurrentUser();
  if (!user) return null;

  const entries = await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt));
  const enrichedEntries = await enrichHistory(entries);
  const history = filterHistory(enrichedEntries, filters);

  return {
    days: groupHistoryByDay(summarizeHistory(history)),
    history,
    origins: availableOrigins(entries),
  };
}

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
