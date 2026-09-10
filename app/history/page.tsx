import type { Metadata } from "next";
import Link from "next/link";
import { History, Play } from "lucide-react";

import { HistoryAccessPanel } from "@/components/history/history-access-panel";
import { HistoryDayGroup } from "@/components/history/history-day-group";
import { HistoryFilters, type HistoryFiltersValue } from "@/components/history/history-filters";
import { getHistoryPageData } from "@/lib/history-query";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Histórico",
  description: "Revise sessões concluídas e repita vídeos com a mesma contagem.",
  alternates: { canonical: "/history" },
};

type HistoryPageProps = { searchParams: Promise<HistoryFiltersValue> };

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const filters = await searchParams;
  const data = await getHistoryPageData(filters);

  if (!data) return <HistoryVisitorPage />;

  return (
    <>
      <section className="studio-shell account-shell" aria-labelledby="history-title">
        <section className="history-surface">
          <HistoryHeading totalSessions={data.history.length} />
          {data.history.length === 0 ? <HistoryEmptyState filters={filters} /> : (
            <>
              <HistoryFilters filters={filters} origins={data.origins} resultCount={data.history.length} />
              <div className="history-days">
                {data.days.map(([day, entriesForDay], index) => <HistoryDayGroup entries={entriesForDay} index={index} key={day} />)}
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
        <p>{hasFilters ? "Ajuste ou limpe os filtros para ver outras sessões." : "Quando um vídeo terminar, ele fica pronto para repetir daqui."}</p>
      </div>
      {hasFilters
        ? <Link className="secondary-button" href="/history">Limpar filtros</Link>
        : <Link className="primary-button" href="/"><Play aria-hidden="true" size={17} />Reproduzir um vídeo</Link>}
    </section>
  );
}
