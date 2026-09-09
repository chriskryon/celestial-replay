import Link from "next/link";
import { History, ListMusic, Repeat2 } from "lucide-react";

import { OpenAuthButton } from "@/components/open-auth-button";

export function HistoryAccessPanel() {
  return (
    <section className="history-access-panel history-access-panel--history has-access-preview">
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
      <div className="access-preview history-access-preview" aria-hidden="true">
        <span>Seu histórico</span>
        <div><i /><p><b>Hoje</b><small>3 vídeos · 11 execuções</small></p></div>
        <div><i /><p><b>Ontem</b><small>2 vídeos · 5 execuções</small></p></div>
        <div><i /><p><b>Segunda-feira</b><small>1 vídeo · 3 execuções</small></p></div>
      </div>
    </section>
  );
}
