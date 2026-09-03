"use client";

import Link from "next/link";
import { History, ListMusic } from "lucide-react";

import { authClient } from "@/lib/auth-client";

export function AccountStudioTabs() {
  const session = authClient.useSession();
  if (!session.data?.user) return null;

  return <>
    <Link className="studio-tab" href="/playlists"><ListMusic aria-hidden="true" size={16} />Minhas playlists</Link>
    <Link className="studio-tab" href="/history"><History aria-hidden="true" size={16} />Histórico</Link>
  </>;
}
