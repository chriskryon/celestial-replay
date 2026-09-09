import Link from "next/link";
import { ListMusic, Repeat2, Video } from "lucide-react";

import { AccountNavigation } from "@/components/account-navigation";
import { OpenAuthButton } from "@/components/open-auth-button";

export function PlaylistAccessPanel() {
  return (
    <>
      <AccountNavigation activeArea="playlists" />
      <section className="studio-shell account-shell" aria-labelledby="playlist-access-title">
        <section className="history-access-panel playlist-access-panel">
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
        </section>
      </section>
    </>
  );
}
