import Link from "next/link";
import { History, ListMusic, Video } from "lucide-react";


type AccountArea = "playlists" | "history";

const tabs: Array<{ href: string; label: string; icon: typeof Video; area?: AccountArea }> = [
  { href: "/", label: "Player", icon: Video },
  { href: "/playlists", label: "Biblioteca", icon: ListMusic, area: "playlists" },
  { href: "/history", label: "Histórico", icon: History, area: "history" },
];

export function AccountAreaTabs({ activeArea }: { activeArea: AccountArea }) {
  return (
    <nav className="studio-tabs" aria-label="Áreas do Celestial Replay">
      {tabs.map(({ href, label, icon: Icon, area }) => {
        const isActive = area === activeArea;
        return <Link aria-current={isActive ? "page" : undefined} className={isActive ? "studio-tab is-selected" : "studio-tab"} href={href} key={href}><Icon aria-hidden="true" size={16} />{label}</Link>;
      })}
    </nav>
  );
}
