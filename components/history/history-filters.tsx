import { ListFilter, Search } from "lucide-react";

export type HistoryFiltersValue = {
  origin?: string;
  period?: string;
  q?: string;
};

export function HistoryFilters({ filters, origins }: { filters: HistoryFiltersValue; origins: string[] }) {
  return (
    <form className="history-filters">
      <label className="history-search">
        <Search aria-hidden="true" size={15} />
        <span className="sr-only">Buscar no histórico</span>
        <input defaultValue={filters.q ?? ""} name="q" placeholder="Buscar vídeo ou origem" />
      </label>
      <label>
        <ListFilter aria-hidden="true" size={15} />
        <span>Período</span>
        <select defaultValue={filters.period ?? ""} name="period">
          <option value="">Tudo</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
      </label>
      <label>
        <span>Origem</span>
        <select defaultValue={filters.origin ?? ""} name="origin">
          <option value="">Todas</option>
          {origins.map((origin) => <option key={origin} value={origin}>{origin}</option>)}
        </select>
      </label>
      <button className="secondary-button" type="submit">Filtrar</button>
    </form>
  );
}
