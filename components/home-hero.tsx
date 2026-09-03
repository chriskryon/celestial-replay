import Link from "next/link";
import { ListMusic, Orbit, Play } from "lucide-react";
import { AuthControls } from "@/components/auth-controls";

export function HomeHero() { return <><header className="studio-heading"><div className="navbar-inner"><h1><Link className="brand-mark" href="/"><span><Orbit size={20}/></span>Celestial Replay</Link></h1><AuthControls/></div></header><section className="home-hero"><div><span className="home-orbit"><Orbit size={28}/></span><h1>Repita no seu ritmo.</h1><p>Reproduza um vídeo ou monte uma sequência com a quantidade exata de repetições. Sem cadastro para começar.</p><div className="home-actions"><Link className="primary-button" href="/default"><Play size={17}/>Repetir um vídeo</Link><Link className="secondary-button" href="/advanced"><ListMusic size={17}/>Criar playlist</Link></div></div><aside><strong>Simples para começar.</strong><p>Entre apenas quando quiser guardar playlists e histórico.</p></aside></section></> }
