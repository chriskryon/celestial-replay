import { isPlayableMediaUrl } from "@/lib/media-url";

type HistoryRecord = {
  completedAt: Date;
  completedRepetitions: number;
  url: string;
};

export type HistorySummary<T extends HistoryRecord = HistoryRecord> = T & {
  sessions: number;
};

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export const historyDateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "medium",
  timeStyle: "short",
});

const dayLabelFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function displaySource(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname}${parsed.search}`;
  } catch {
    return url;
  }
}

export function historyDay(date: Date) {
  return dayFormatter.format(date);
}

export function historyDayLabel(date: Date) {
  const key = historyDay(date);
  if (key === historyDay(new Date())) return "Hoje";
  if (key === historyDay(new Date(Date.now() - 86_400_000))) return "Ontem";
  return dayLabelFormatter.format(date);
}

/** A day/video summary prevents one looping session from overwhelming the timeline. */
export function summarizeHistory<T extends HistoryRecord>(entries: T[]) {
  return Array.from(entries.reduce((groups, entry) => {
    const key = `${historyDay(entry.completedAt)}:${entry.url}`;
    const current = groups.get(key);
    if (current) {
      current.completedRepetitions += entry.completedRepetitions;
      current.sessions += 1;
      return groups;
    }
    groups.set(key, { ...entry, sessions: 1 });
    return groups;
  }, new Map<string, HistorySummary<T>>()).values());
}

export function groupHistoryByDay<T extends HistoryRecord>(entries: HistorySummary<T>[]) {
  return Array.from(entries.reduce((groups, entry) => {
    const key = historyDay(entry.completedAt);
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
    return groups;
  }, new Map<string, HistorySummary<T>[]>()).entries());
}

export function isVisibleHistoryEntry(entry: HistoryRecord) {
  return isPlayableMediaUrl(entry.url);
}
