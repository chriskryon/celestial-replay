import Link from "next/link";
import { History, ListMusic, Repeat2, Video } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { OpenAuthButton } from "@/components/open-auth-button";

export function PlaylistAccessPanel() {
  return <>
    <header className="studio-heading"><div className="navbar-inner"><h1><Link className="brand-mark" href="/"><span aria-hidden="true"><ListMusic size={19} /></span>Celestial Replay</Link></h1><AuthControls /></div></header>
    <section className="studio-shell account-shell" aria-labelledby="playlist-access-title">
      <nav className="studio-tabs" aria-label="Áreas do Celestial Replay"><Link className="studio-tab" href="/"><Video aria-hidden="true" size={16} />Vídeo único</Link><Link className="studio-tab" href="/advanced"><ListMusic aria-hidden="true" size={16} />Playlist</Link><Link className="studio-tab is-selected" href="/playlists" aria-current="page"><ListMusic aria-hidden="true" size={16} />Minhas playlists</Link><Link className="studio-tab" href="/history"><History aria-hidden="true" size={16} />Histórico</Link></nav>
      <section className="history-access-panel playlist-access-panel">
        <span className="history-access-icon"><ListMusic aria-hidden="true" size={26} /></span>
        <div className="history-access-copy"><span className="eyebrow">Sua biblioteca pessoal</span><h1 id="playlist-access-title">Guarde suas filas favoritas.</h1><p>Crie sequências com quantas repetições quiser e encontre tudo de novo, em qualquer dispositivo.</p></div>
        <ul className="history-access-benefits"><li><ListMusic aria-hidden="true" size={16} />Playlists privadas e editáveis</li><li><Repeat2 aria-hidden="true" size={16} />Repetições por vídeo, do seu jeito</li><li><Video aria-hidden="true" size={16} />Continue usando o player sem conta</li></ul>
        <div className="history-access-actions"><OpenAuthButton className="primary-button"><ListMusic aria-hidden="true" size={17} />Entrar para salvar</OpenAuthButton><Link className="secondary-button" href="/advanced">Montar sem conta</Link></div>
      </section>
    </section>
  </>;
}
