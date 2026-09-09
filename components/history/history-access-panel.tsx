import Link from "next/link";
import { History, ListMusic, Repeat2 } from "lucide-react";

import { OpenAuthButton } from "@/components/open-auth-button";

export function HistoryAccessPanel() {
  return (
    <section className="history-access-panel">
      <span className="history-access-icon"><History aria-hidden="true" size={26} /></span>
      <div className="history-access-copy">
        <span className="eyebrow">Seu espaço pessoal</span>
        <h1 id="history-title">Guarde o que vale repetir.</h1>
        <p>Histórico, playlists e retomada ficam privados na sua conta. Você ainda pode reproduzir vídeos livremente sem entrar.</p>
      </div>
      <ul className="history-access-benefits">
        <li><History aria-hidden="true" size={16} />Sessões organizadas por dia</li>
        <li><ListMusic aria-hidden="true" size={16} />Playlists disponíveis em qualquer dispositivo</li>
        <li><Repeat2 aria-hidden="true" size={16} />Retome uma fila de onde parou</li>
      </ul>
      <div className="history-access-actions">
        <OpenAuthButton className="primary-button"><History aria-hidden="true" size={17} />Entrar para guardar</OpenAuthButton>
        <Link className="secondary-button" href="/">Continuar sem conta</Link>
      </div>
    </section>
  );
}
