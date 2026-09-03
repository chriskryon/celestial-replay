"use client";

import Link from "next/link";

import { authClient } from "@/lib/auth-client";

export function AuthControls() {
  const session = authClient.useSession();

  if (session.isPending) return <span className="account-status">Conta</span>;
  if (!session.data?.user) return <Link className="account-link" href="/auth/sign-in">Entrar para salvar</Link>;

  const name = session.data.user.name || session.data.user.email || "Sua conta";
  return <div className="account-actions"><Link className="account-link" href="/history">{name}</Link><button className="account-signout" type="button" onClick={() => authClient.signOut()}>Sair</button></div>;
}
