import Link from "next/link";
import type { CSSProperties } from "react";
import { AudioLines, CalendarClock, ChevronDown, ExternalLink, Repeat2, RotateCcw, Video, Youtube } from "lucide-react";

import { displayHost, displaySource, historyDateTimeFormatter, historyDayLabel, type HistorySummary } from "@/lib/history-presentation";

type HistoryViewSummary = HistorySummary & { authorName: string | null; title: string };

function SourceIcon({ url }: { url: string }) {
  const host = displayHost(url);
  if (host.includes("youtube.com") || host === "youtu.be") return <Youtube aria-hidden="true" size={17} />;
  if (host.includes("soundcloud.com")) return <AudioLines aria-hidden="true" size={17} />;
  return <Video aria-hidden="true" size={17} />;
}

export function HistoryDayGroup({ entries, index }: { entries: HistoryViewSummary[]; index: number }) {
  const [firstEntry] = entries;
  const totalRepetitions = entries.reduce((total, entry) => total + entry.completedRepetitions, 0);
  const totalSessions = entries.reduce((total, entry) => total + entry.sessions, 0);
  const isToday = new Date(firstEntry.completedAt).toDateString() === new Date().toDateString();
  return (
    <details className="history-day" open={isToday} style={{ "--history-day-index": index } as CSSProperties}>
      <summary>
        <h2>{historyDayLabel(firstEntry.completedAt)}</h2>
        <span>{entries.length} {entries.length === 1 ? "vídeo" : "vídeos"} · {totalRepetitions}× em {totalSessions} {totalSessions === 1 ? "sessão" : "sessões"}</span>
        <ChevronDown aria-hidden="true" size={16} />
      </summary>
      <ol className="history-feed">
        {entries.map((entry, entryIndex) => {
          const source = displaySource(entry.url);
          const date = historyDateTimeFormatter.format(entry.completedAt);
          return (
            <li key={entry.url} style={{ "--history-entry-index": entryIndex } as CSSProperties}>
              <article className="history-card">
                <span className="history-domain-icon"><SourceIcon url={entry.url} /></span>
                <div className="history-card-copy">
                  <a href={entry.url} rel="noreferrer" target="_blank" title={entry.url}>
                    <strong>{entry.title}</strong><ExternalLink aria-hidden="true" size={14} />
                  </a>
                  <p><CalendarClock aria-hidden="true" size={14} />{date}{entry.authorName ? ` · ${entry.authorName}` : ""}</p>
                  <a className="history-source-link" href={entry.url} rel="noreferrer" target="_blank" title={entry.url}>{source}</a>
                </div>
                <div className="history-card-actions">
                  <span className="timeline-count"><Repeat2 aria-hidden="true" size={14} />{entry.completedRepetitions}× em {entry.sessions} {entry.sessions === 1 ? "sessão" : "sessões"}</span>
                  <Link className="history-replay" href={`/?source=${encodeURIComponent(entry.url)}&repetitions=${entry.completedRepetitions}`}>
                    <RotateCcw aria-hidden="true" size={15} />Repetir
                  </Link>
                </div>
              </article>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
