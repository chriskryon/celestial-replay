import Link from "next/link";
import { ListMusic, Repeat2, Video } from "lucide-react";

import { AccountAreaTabs } from "@/components/account-navigation";
import { OpenAuthButton } from "@/components/open-auth-button";

export function PlaylistAccessPanel() {
  return (
    <section className="studio-shell account-shell" aria-labelledby="playlist-access-title">
        <AccountAreaTabs activeArea="playlists" />
        <section className="history-access-panel playlist-access-panel has-access-preview">
          <span className="history-access-icon"><ListMusic aria-hidden="true" size={26} /></span>
          <div className="history-access-copy">
            <span className="eyebrow">Sua biblioteca pessoal</span>
            <h1 id="playlist-access-title">Guarde suas filas favoritas.</h1>
            <p>Crie sequências com quantas repetições quiser e encontre tudo de novo, em qualquer dispositivo.</p>
          </div>
          <ul className="history-access-benefits">
            <li><ListMusic aria-hidden="true" size={16} />Playlists privadas e editáveis</li>
            <li><Repeat2 aria-hidden="true" size={16} />Repetições por vídeo, do seu jeito</li>
            <li><Video aria-hidden="true" size={16} />Continue usando o player sem conta</li>
          </ul>
          <div className="history-access-actions">
            <OpenAuthButton className="primary-button"><ListMusic aria-hidden="true" size={17} />Entrar para salvar</OpenAuthButton>
            <Link className="secondary-button" href="/advanced">Montar sem conta</Link>
          </div>
          <div className="access-preview library-access-preview" aria-hidden="true">
            <span>Na sua biblioteca</span>
            <div><i /><p><b>Estudos matinais</b><small>4 vídeos · 9 execuções</small></p></div>
            <div><i /><p><b>Foco profundo</b><small>2 vídeos · 6 execuções</small></p></div>
            <div><i /><p><b>Revisar depois</b><small>3 vídeos · 3 execuções</small></p></div>
          </div>
        </section>
    </section>
  );
}
