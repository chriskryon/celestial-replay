import Link from "next/link";
import { AudioLines, CalendarClock, ExternalLink, Repeat2, RotateCcw, Video, Youtube } from "lucide-react";

import { displayHost, displaySource, historyDateTimeFormatter, historyDayLabel, type HistorySummary } from "@/lib/history-presentation";

function SourceIcon({ url }: { url: string }) {
  const host = displayHost(url);
  if (host.includes("youtube.com") || host === "youtu.be") return <Youtube aria-hidden="true" size={17} />;
  if (host.includes("soundcloud.com")) return <AudioLines aria-hidden="true" size={17} />;
  return <Video aria-hidden="true" size={17} />;
}

export function HistoryDayGroup({ entries }: { entries: HistorySummary[] }) {
  const [firstEntry] = entries;
  return (
    <section className="history-day">
      <header>
        <h2>{historyDayLabel(firstEntry.completedAt)}</h2>
        <span>{entries.length} {entries.length === 1 ? "vídeo" : "vídeos"}</span>
      </header>
      <ol className="history-feed">
        {entries.map((entry) => {
          const source = displaySource(entry.url);
          const date = historyDateTimeFormatter.format(entry.completedAt);
          return (
            <li key={entry.url}>
              <article className="history-card">
                <span className="history-domain-icon"><SourceIcon url={entry.url} /></span>
                <div className="history-card-copy">
                  <a href={entry.url} rel="noreferrer" target="_blank" title={entry.url}>
                    <strong>{source}</strong><ExternalLink aria-hidden="true" size={14} />
                  </a>
                  <p><CalendarClock aria-hidden="true" size={14} />{date}</p>
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
    </section>
  );
}
