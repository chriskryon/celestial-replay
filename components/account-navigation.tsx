import Link from "next/link";
import { History, ListMusic, Video } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";

type AccountArea = "playlists" | "history";

const tabs: Array<{ href: string; label: string; icon: typeof Video; area?: AccountArea }> = [
  { href: "/", label: "Vídeo único", icon: Video },
  { href: "/advanced", label: "Playlist", icon: ListMusic },
  { href: "/playlists", label: "Minhas playlists", icon: ListMusic, area: "playlists" },
  { href: "/history", label: "Histórico", icon: History, area: "history" },
];

/** Shared navigation keeps account pages visually and semantically consistent. */
export function AccountNavigation({ activeArea }: { activeArea: AccountArea }) {
  return (
    <>
      <header className="studio-heading">
        <div className="navbar-inner">
          <h1>
            <Link className="brand-mark" href="/">
              <span aria-hidden="true"><ListMusic size={19} /></span>
              Celestial Replay
            </Link>
          </h1>
          <AuthControls />
        </div>
      </header>

      <nav className="studio-tabs" aria-label="Áreas do Celestial Replay">
        {tabs.map(({ href, label, icon: Icon, area }) => {
          const isActive = area === activeArea;
          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "studio-tab is-selected" : "studio-tab"}
              href={href}
              key={href}
            >
              <Icon aria-hidden="true" size={16} />
              {label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
