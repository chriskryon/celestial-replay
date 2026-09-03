import Link from "next/link";
import { desc, eq } from "drizzle-orm";

import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { playbackHistory } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  const entries = user ? await db.select().from(playbackHistory)
    .where(eq(playbackHistory.ownerId, user.id))
    .orderBy(desc(playbackHistory.completedAt)) : [];

  if (user) return <section className="empty-surface" aria-labelledby="history-title">
    <h1 id="history-title">Seu histórico</h1>
    {entries.length === 0 ? <p>Nenhuma sessão concluída ainda. Ao terminar uma repetição, ela aparece aqui.</p> : <ol className="history-list">{entries.map((entry) => <li key={entry.id}><span>{entry.url}</span><strong>{entry.completedRepetitions}×</strong></li>)}</ol>}
  </section>;

  return (
    <section className="empty-surface" aria-labelledby="history-title">
      <span className="eyebrow">Conta Celestial</span>
      <h1 id="history-title">Seu histórico fica guardado na sua conta.</h1>
      <p>
        Você pode reproduzir vídeos sem entrar. Quando a autenticação Neon estiver
        conectada, as sessões concluídas aparecerão aqui — privadas e sincronizadas.
      </p>
      <Link className="button button-primary" href="/auth/sign-in">
        Entrar para sincronizar
      </Link>
    </section>
  );
}
