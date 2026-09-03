import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { CalendarClock, ChevronLeft, CircleCheck, ExternalLink, History, Play, Repeat2 } from "lucide-react";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";
import { isPlayableMediaUrl } from "@/lib/media-url";

export const dynamic = "force-dynamic";

function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const entries = user ? await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt)) : [];
  const playableEntries = entries.filter((entry) => isPlayableMediaUrl(entry.url));

  if (user) return <section className="history-surface" aria-labelledby="history-title">
    <Link className="auth-back" href="/"><ChevronLeft aria-hidden="true" size={16} />Voltar ao player</Link>
    <header className="history-heading"><span className="history-heading-icon"><History aria-hidden="true" size={22} /></span><div><h1 id="history-title">Seu histórico</h1><p>As sessões concluídas ficam aqui, em ordem do que você viu por último.</p></div></header>
    {playableEntries.length === 0 ? <div className="history-empty"><Play aria-hidden="true" size={22} /><p>Nenhuma sessão concluída ainda. Sua primeira repetição aparecerá aqui.</p><Link className="primary-button" href="/">Reproduzir um vídeo</Link></div> : <ol className="history-timeline">{playableEntries.map((entry) => {
      const host = displayHost(entry.url);
      const date = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "medium" }).format(entry.completedAt);
      return <li key={entry.id}><span className="timeline-marker"><CircleCheck aria-hidden="true" size={14} /></span><article><div className="history-entry-meta"><p className="timeline-kicker"><CalendarClock aria-hidden="true" size={14} />{date}</p><span className="timeline-count"><Repeat2 aria-hidden="true" size={14} />{entry.completedRepetitions}×</span></div><a href={entry.url} target="_blank" rel="noreferrer" title={entry.url}><strong>{host}</strong><ExternalLink aria-hidden="true" size={15} /></a></article></li>;
    })}</ol>}
  </section>;

  return (
    <section className="empty-surface" aria-labelledby="history-title">
      <h1 id="history-title">Seu histórico fica guardado na sua conta.</h1>
      <p>
        Você pode reproduzir vídeos sem entrar. Quando a autenticação Neon estiver
        conectada, as sessões concluídas aparecerão aqui — privadas e sincronizadas.
      </p>
      <Link className="button button-primary" href="/auth/sign-in">
        <History aria-hidden="true" size={17} />Entrar para sincronizar
      </Link>
    </section>
  );
}
